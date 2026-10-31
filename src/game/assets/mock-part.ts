import layouts from '../data/part-geometry.json';
import chargeLayouts from '../data/massive-charge-geometry.json';
import type { Bounds, Raster, SwfMatrix } from './asset-pack';

const PALETTE = {
  primary: { light: '#ffeda6', middle: '#d2a800', spot: '#fbc900', rim: '#ffffff' },
  enemy: { light: '#ffe1ad', middle: '#dc922c', spot: '#ffc367', rim: '#fff5de' },
  accent: { light: '#ffd9b3', middle: '#d15503', spot: '#f78311', rim: '#ffffff' },
  charge: { light: '#dda2b4', middle: '#ff6699', spot: '#9c3857', rim: '#ffffff' },
};
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
export function mockPartLayout(id: number, chargeFrame = 1): MockPartLayout | undefined {
  const idle = (layouts as Record<number, MockPartLayout>)[id === 2013 ? 5003 : id];
  if (id !== 3008 || chargeFrame <= 1) return idle;
  const charge = chargeLayouts[Math.min(25, chargeFrame - 2)] as MockPartLayout;
  //720's frame27 removes every particle before wrapping to stopped frame1.
  if (!charge.bubbles.length) return idle;
  const x = Math.min(idle.bounds.x, charge.bounds.x),
    y = Math.min(idle.bounds.y, charge.bounds.y);
  return {
    ...idle,
    bounds: {
      x,
      y,
      width: Math.max(idle.bounds.x + idle.bounds.width, charge.bounds.x + charge.bounds.width) - x,
      height:
        Math.max(idle.bounds.y + idle.bounds.height, charge.bounds.y + charge.bounds.height) - y,
    },
    bubbles: [...idle.bubbles, ...charge.bubbles],
  };
}

function paintWeapon(ctx: CanvasRenderingContext2D, layout: MockPartLayout, enemy: boolean) {
  for (const bubble of layout.bubbles) {
    const { matrix: m, x, y, rx, ry, tint, alpha } = bubble;
    const palette = [718, 719].includes(bubble.leaf)
      ? PALETTE.charge
      : bubble.accent
        ? PALETTE.accent
        : enemy
          ? PALETTE.enemy
          : PALETTE.primary;
    const color = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.min(255, c * tint[0] + tint[1]))).join(',')})`;
    };
    ctx.save();
    ctx.transform(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color(palette.middle);
    ctx.fill();
    ctx.lineWidth = bubble.lineWidth;
    ctx.strokeStyle = color(palette.rim);
    if (bubble.lineWidth > 0) ctx.stroke();
    // Recreate the shared bubble motif with procedural spots, not imported contours.
    const spots = [
      [-0.64, -0.22, 0.18, 0.25, palette.light],
      [-0.18, -0.63, 0.14, 0.15, palette.light],
      [0.05, 0.5, 0.14, 0.15, palette.spot],
      [0.45, 0.25, 0.17, 0.18, palette.spot],
    ] as const;
    for (const [dx, dy, sx, sy, fill] of spots) {
      ctx.beginPath();
      ctx.ellipse(x + dx * rx, y + dy * ry, sx * rx, sy * ry, 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color(fill);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Procedural fallback only; original SWF artwork continues through AssetPack unchanged. */
export function mockPart(id: number, chargeFrame = 1): Raster {
  const body = id < 2000;
  const layout = body ? undefined : (mockPartLayout(id, chargeFrame) ?? mockPartLayout(2001));
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
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bounds.width * 2);
  canvas.height = Math.ceil(bounds.height * 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(2, 2);
  ctx.translate(-bounds.x, -bounds.y);

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
  else if (layout) paintWeapon(ctx, layout, (id >= 4000 && id < 5000) || (id >= 6000 && id < 7000));
  return {
    ...bounds,
    canvas,
    resolution: 2,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    url: canvas.toDataURL('image/png'),
  };
}
