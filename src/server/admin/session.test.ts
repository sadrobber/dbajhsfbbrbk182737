import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkCredentials,
  createSessionToken,
  DEV_CREDENTIALS,
  getAdminCredentials,
  safeAdminRedirect,
  SESSION_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./session";

afterEach(() => vi.unstubAllEnvs());

describe("temporary admin login", () => {
  it("uses ADMIN_EMAIL / ADMIN_PASSWORD when set", () => {
    vi.stubEnv("ADMIN_EMAIL", "staff@shop.test");
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    expect(checkCredentials(" Staff@Shop.test ", "s3cret")).toBe(true);
    expect(checkCredentials("staff@shop.test", "wrong")).toBe(false);
    expect(checkCredentials(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)).toBe(false);
  });

  it("falls back to dev credentials outside production only", () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getAdminCredentials()?.source).toBe("dev-default");
    vi.stubEnv("NODE_ENV", "production");
    expect(getAdminCredentials()).toBeNull();
    expect(checkCredentials(DEV_CREDENTIALS.email, DEV_CREDENTIALS.password)).toBe(false);
  });

  it("accepts its own session token and rejects tampered or expired ones", () => {
    vi.stubEnv("ADMIN_EMAIL", "staff@shop.test");
    vi.stubEnv("ADMIN_PASSWORD", "s3cret");
    const now = Date.UTC(2026, 8, 25);
    const token = createSessionToken(now)!;
    expect(verifySessionToken(token, now)).toEqual({ email: "staff@shop.test" });

    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "staff@shop.test", exp: 9_999_999_999 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, now)).toBeNull();
    expect(verifySessionToken(`${payload}.x${signature}`, now)).toBeNull();
    expect(verifySessionToken(token, now + (SESSION_MAX_AGE_SECONDS + 1) * 1000)).toBeNull();

    vi.stubEnv("ADMIN_PASSWORD", "changed");
    expect(verifySessionToken(token, now)).toBeNull();
  });

  it("only redirects to admin pages after login", () => {
    expect(safeAdminRedirect("/admin/products?q=pixel")).toBe("/admin/products?q=pixel");
    expect(safeAdminRedirect("https://evil.test")).toBe("/admin");
    expect(safeAdminRedirect("//evil.test/admin")).toBe("/admin");
    expect(safeAdminRedirect("/admin/login")).toBe("/admin");
    expect(safeAdminRedirect(null)).toBe("/admin");
  });
});
