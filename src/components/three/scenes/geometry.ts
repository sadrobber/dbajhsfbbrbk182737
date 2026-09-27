import {
  CanvasTexture,
  Float32BufferAttribute,
  SRGBColorSpace,
  Shape,
  type BufferGeometry,
} from "three";

/** Rectangle with rounded corners, centred on the origin. */
export function roundedRectShape(width: number, height: number, radius: number): Shape {
  const r = Math.min(radius, width / 2, height / 2);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** Maps a flat geometry's UVs to 0..1 over its bounding box (for screen textures). */
export function normalizeUVs<T extends BufferGeometry>(geometry: T): T {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const position = geometry.attributes.position;
  const width = box.max.x - box.min.x || 1;
  const height = box.max.y - box.min.y || 1;
  const uv: number[] = [];
  for (let i = 0; i < position.count; i++) {
    uv.push((position.getX(i) - box.min.x) / width, (position.getY(i) - box.min.y) / height);
  }
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** A generic, unbranded "switched on" screen: electric-blue glow and a few interface cards. */
export function createScreenTexture() {
  return canvasTexture(256, 512, (ctx) => {
    const bg = ctx.createRadialGradient(80, 110, 10, 128, 256, 420);
    bg.addColorStop(0, "#6ea8ec");
    bg.addColorStop(0.35, "#2a6ad0");
    bg.addColorStop(0.75, "#0b1a4a");
    bg.addColorStop(1, "#050814");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 512);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(ctx, 28, 250, 200, 46, 23);
    ctx.fillStyle = "rgba(255,255,255,0.11)";
    roundRect(ctx, 28, 308, 150, 46, 23);
    ctx.fillStyle = "#1f7bff";
    roundRect(ctx, 28, 400, 200, 60, 30);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRect(ctx, 96, 18, 64, 8, 4);
  });
}

/** Soft round shadow drawn under floating models (replaces a dark background for depth). */
export function createShadowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(15,20,35,0.5)");
    g.addColorStop(0.45, "rgba(15,20,35,0.2)");
    g.addColorStop(1, "rgba(15,20,35,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }, false);
}

/** Electric-blue halo, for glows that must read on a white background. */
export function createGlowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(27,103,218,0.55)");
    g.addColorStop(0.5, "rgba(27,103,218,0.18)");
    g.addColorStop(1, "rgba(27,103,218,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}
