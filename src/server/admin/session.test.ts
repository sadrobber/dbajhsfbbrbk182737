import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkCredentials,
  createSessionToken,
  DEV_CREDENTIALS,
  getAdminAccounts,
  safeAdminRedirect,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./session";

afterEach(() => vi.unstubAllEnvs());

const now = Date.UTC(2026, 8, 25);

function twoPeople() {
  vi.stubEnv("ADMIN_EMAIL", "owner@shop.test");
  vi.stubEnv("ADMIN_PASSWORD", "owner-pass");
  vi.stubEnv("ADMIN_EMAIL_2", "sarah@shop.test");
  vi.stubEnv("ADMIN_PASSWORD_2", "sarah-pass");
}

describe("temporary admin login", () => {
  it("uses ADMIN_EMAIL / ADMIN_PASSWORD when set", () => {
    vi.stubEnv("ADMIN_EMAIL", "staff@shop.test");
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect(checkCredentials(" Staff@Shop.test ", "s3cret")).toBe("staff@shop.test");
    expect(checkCredentials("staff@shop.test", "wrong")).toBeNull();
    expect(checkCredentials(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)).toBeNull();
  });

  it("lets each person sign in with their own pair, and only their own", () => {
    twoPeople();
    vi.stubEnv("ADMIN_EMAIL_MARCO", "marco@shop.test");
    vi.stubEnv("ADMIN_PASSWORD_MARCO", "marco-pass");
    expect(getAdminAccounts()?.accounts.map((a) => a.email)).toEqual([
      "owner@shop.test",
      "sarah@shop.test",
      "marco@shop.test",
    ]);
    expect(checkCredentials("sarah@shop.test", "sarah-pass")).toBe("sarah@shop.test");
    expect(checkCredentials("marco@shop.test", "marco-pass")).toBe("marco@shop.test");
    // Someone else's password doesn't work.
    expect(checkCredentials("sarah@shop.test", "owner-pass")).toBeNull();
  });

  it("skips a person whose email or password is missing", () => {
    twoPeople();
    vi.stubEnv("ADMIN_PASSWORD_2", "");
    expect(getAdminAccounts()?.accounts.map((a) => a.email)).toEqual(["owner@shop.test"]);
    expect(checkCredentials("sarah@shop.test", "")).toBeNull();
  });

  it("falls back to dev credentials outside production only", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAdminAccounts()?.source).toBe("dev-default");
    vi.stubEnv("NODE_ENV", "production");
    expect(getAdminAccounts()).toBeNull();
    expect(checkCredentials(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)).toBeNull();
  });

  it("accepts its own session token and rejects tampered or expired ones", () => {
    vi.stubEnv("ADMIN_EMAIL", "staff@shop.test");
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const token = createSessionToken("staff@shop.test", now)!;
    expect(verifySessionToken(token, now)).toEqual({ email: "staff@shop.test" });

    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "staff@shop.test", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, now)).toBeNull();
    expect(verifySessionToken(`${payload}.x${signature}`, now)).toBeNull();
    expect(verifySessionToken(token, now + (SESSION_MAX_AGE_SECONDS + 1) * 1000)).toBeNull();

    vi.stubEnv("ADMIN_PASSWORD", "changed");
    expect(verifySessionToken(token, now)).toBeNull();
  });

  it("signs out only the person who was removed or changed their password", () => {
    twoPeople();
    const owner = createSessionToken("owner@shop.test", now)!;
    const sarah = createSessionToken("sarah@shop.test", now)!;
    expect(verifySessionToken(sarah, now)).toEqual({ email: "sarah@shop.test" });

    // A session can't be moved to another person.
    const [, sarahSignature] = sarah.split(".");
    const asOwner = Buffer.from(JSON.stringify({ sub: "owner@shop.test", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${asOwner}.${sarahSignature}`, now)).toBeNull();

    vi.stubEnv("ADMIN_PASSWORD_2", "new-pass");
    expect(verifySessionToken(sarah, now)).toBeNull();
    expect(verifySessionToken(owner, now)).toEqual({ email: "owner@shop.test" });

    vi.stubEnv("ADMIN_EMAIL_2", "");
    vi.stubEnv("ADMIN_PASSWORD_2", "");
    expect(createSessionToken("sarah@shop.test", now)).toBeNull();
    expect(verifySessionToken(owner, now)).toEqual({ email: "owner@shop.test" });
  });

  it("only redirects to admin pages after login", () => {
    expect(safeAdminRedirect("/admin/products?q=pixel")).toBe("/admin/products?q=pixel");
    expect(safeAdminRedirect("https://evil.test")).toBe("/admin");
    expect(safeAdminRedirect("//evil.test/admin")).toBe("/admin");
    expect(safeAdminRedirect("/admin/login")).toBe("/admin");
    expect(safeAdminRedirect(null)).toBe("/admin");
  });
});
