import layouts from '../data/part-geometry.json';
import leafFacts from '../data/mock-part-leaves.json';
import type { Bounds, Raster, SwfMatrix } from './asset-pack';

interface LeafFacts {
  colors: { base: number; light: number; spot: number };
  rim: number;
  circles: {
    x: number;
    y: number;
    rx: number;
    ry: number;
    lineWidth: number;
    glints: { x: number; y: number; rx: number; ry: number; rotation: number; color: number }[];
  }[];
}
const leaves = leafFacts as Record<number, LeafFacts>;
/** Geometric procedural circles, including their rims, independent of paint alpha. */
export function mockPartLeafHit(id: number, x: number, y: number): boolean | undefined {
  const facts = leaves[id];
  return facts?.circles.some((circle) => {
    const rx = circle.rx + circle.lineWidth / 2,
      ry = circle.ry + circle.lineWidth / 2;
    return ((x - circle.x) / rx) ** 2 + ((y - circle.y) / ry) ** 2 <= 1;
  });
}
interface MockPartLayout {
  symbol: number;
  frame: number;
  bounds: Bounds;
  bubbles: {
    leaf: number;
    matrix: SwfMatrix;
    x: number;
    y: number;
    rx: number;
    ry: number;
    lineWidth: number;
    alpha: number;
    tint: number[];
    accent: boolean;
  }[];
}
/** Frozen authored layout facts, separate from procedural paint and simulation. */
export function mockPartLayout(id: number): MockPartLayout | undefined {
  return (layouts as Record<number, MockPartLayout>)[id === 2013 ? 5003 : id];
}

function paintWeapon(ctx: CanvasRenderingContext2D, layout: MockPartLayout) {
  for (const bubble of layout.bubbles) {
    const { matrix: m, x, y, rx, ry, tint, alpha } = bubble;
    const facts = leaves[bubble.leaf];
    const circle = facts.circles.reduce((a, b) =>
      Math.hypot(a.x - x, a.y - y) < Math.hypot(b.x - x, b.y - y) ? a : b,
    );
    const color = (n: number) => {
      return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, c * tint[0] + tint[1]))).join(',')})`;
    };
    ctx.save();
    ctx.transform(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color(facts.colors.base);
    ctx.fill();
    ctx.lineWidth = bubble.lineWidth;
    ctx.strokeStyle = color(facts.rim);
    if (bubble.lineWidth > 0) ctx.stroke();
    // Source-derived area/covariance ellipses approximate each visible glint.
    for (const glint of circle.glints) {
      ctx.beginPath();
      ctx.ellipse(glint.x, glint.y, glint.rx, glint.ry, glint.rotation, 0, Math.PI * 2);
      ctx.fillStyle = color(glint.color);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Procedural fallback only; original SWF artwork continues through AssetPack unchanged. */
export function mockPart(id: number): Raster {
  const body = id < 2000;
  const layout = body ? undefined : (mockPartLayout(id) ?? mockPartLayout(2001));
  const base = [7, 12.6, 22.5, 28.75, 39][(id % 10) - 1] ?? 18;
  const radius = body && id >= 1500 ? 32 : base,
    bounds = layout
      ? {
          x: layout.bounds.x - 3,
          y: layout.bounds.y - 3,
          width: layout.bounds.width + 6,
          height: layout.bounds.height + 6,
        }
      : { x: -radius - 3, y: -radius - 3, width: radius * 2 + 6, height: radius * 2 + 6 };
  return proceduralRaster(bounds, (ctx) => {
    function bubble(x: number, y: number, r: number, armored = false) {
      const fill = ctx.createRadialGradient(x - r * 0.18, y - r * 0.22, 0, x, y, r);
      // Native bodies have a blue film, not an empty center. Keep enough translucency
      // to pick up the field beneath, with filled collision coverage throughout.
      fill.addColorStop(0, armored ? 'rgba(15,114,157,.64)' : 'rgba(15,140,190,.65)');
      fill.addColorStop(0.72, armored ? 'rgba(12,104,147,.65)' : 'rgba(15,137,187,.64)');
      fill.addColorStop(1, armored ? 'rgba(10,91,135,.7)' : 'rgba(11,119,165,.68)');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = armored ? '#bdebf4' : '#e1fbff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const glints =
        r >= 18
          ? [
              [-0.62, -0.2, 0.15, 0.21, 0.42, 0.9],
              [-0.18, -0.59, 0.14, 0.15, -0.35, 0.83],
              [0.04, 0.48, 0.12, 0.15, 0.25, 0.4],
              [0.44, 0.25, 0.14, 0.16, -0.3, 0.58],
              [0.52, -0.36, 0.07, 0.09, 0.3, 0.33],
            ]
          : [
              [-0.43, -0.4, 0.17, 0.2, 0.4, 0.87],
              [0.36, 0.42, 0.13, 0.16, -0.35, 0.48],
            ];
      for (const [dx, dy, rx, ry, rotation, alpha] of glints) {
        ctx.fillStyle = `rgba(204,247,255,${alpha})`;
        ctx.beginPath();
        ctx.ellipse(x + r * dx, y + r * dy, r * rx, r * ry, rotation, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (body && id >= 1500) for (let i = 0; i < 5; i++) bubble((i - 2) * 10, Math.sin(i) * 9, 8);
    else if (body) bubble(0, 0, radius, id >= 1100 && id < 1200);
    else if (layout) paintWeapon(ctx, layout);
  });
}

export function mockPartLeaf(id: number, bounds: Bounds): Raster | undefined {
  const facts = leaves[id];
  if (!facts) return;
  return proceduralRaster(
    { x: bounds.x - 2, y: bounds.y - 2, width: bounds.width + 4, height: bounds.height + 4 },
    (ctx) => {
      paintWeapon(ctx, {
        symbol: id,
        frame: 1,
        bounds,
        bubbles: facts.circles.map((c) => ({
          ...c,
          leaf: id,
          matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
          alpha: 1,
          tint: [1, 0],
          accent: id === 14,
        })),
      });
    },
  );
}

function proceduralRaster(bounds: Bounds, paint: (ctx: CanvasRenderingContext2D) => void): Raster {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bounds.width * 2);
  canvas.height = Math.ceil(bounds.height * 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(2, 2);
  ctx.translate(-bounds.x, -bounds.y);
  paint(ctx);
  return {
    ...bounds,
    canvas,
    resolution: 2,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    url: canvas.toDataURL('image/png'),
  };
}
