import { describe, expect, it } from "vitest";
import { decideThreeMode, scrollProgress, smoothstep } from "./support";

const capable = { webgl: true, reducedMotion: false, deviceMemory: 8, cores: 8, saveData: false, override: null };

describe("decideThreeMode", () => {
  it("shows 3D on a capable device", () => {
    expect(decideThreeMode(capable)).toBe("3d");
  });
  it("falls back to the static image without WebGL, with reduced motion or on low-end devices", () => {
    expect(decideThreeMode({ ...capable, webgl: false })).toBe("static");
    expect(decideThreeMode({ ...capable, reducedMotion: true })).toBe("static");
    expect(decideThreeMode({ ...capable, deviceMemory: 2 })).toBe("static");
    expect(decideThreeMode({ ...capable, cores: 2 })).toBe("static");
    expect(decideThreeMode({ ...capable, saveData: true })).toBe("static");
  });
  it("treats unknown memory and cores as capable (Safari does not expose them)", () => {
    expect(decideThreeMode({ webgl: true, reducedMotion: false })).toBe("3d");
  });
  it("honours ?3d=on / ?3d=off, but never forces 3D without WebGL", () => {
    expect(decideThreeMode({ ...capable, override: "off" })).toBe("static");
    expect(decideThreeMode({ ...capable, reducedMotion: true, override: "on" })).toBe("3d");
    expect(decideThreeMode({ ...capable, webgl: false, override: "on" })).toBe("static");
  });
});

describe("scroll helpers", () => {
  it("measures progress through the viewport", () => {
    expect(scrollProgress(900, 400, 900)).toBe(0);
    expect(scrollProgress(-400, 400, 900)).toBe(1);
    expect(scrollProgress(250, 400, 900)).toBe(0.5);
  });
  it("smoothstep eases between edges", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
});
