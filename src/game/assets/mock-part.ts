import { partById } from '../data/catalog';
import type { Raster } from './asset-pack';

const PALETTE = {
  primary: { light: '#fff193', middle: '#e8c51c', edge: '#c59c08', rim: '#fff8c0' },
  utility: { light: '#ffe9aa', middle: '#dcb84d', edge: '#ae8129', rim: '#fff3cb' },
  enemy: { light: '#ffdc91', middle: '#eea144', edge: '#c36e24', rim: '#ffe8bf' },
};
type WarmPalette = (typeof PALETTE)[keyof typeof PALETTE];

/** Procedural fallback only; original SWF artwork continues through AssetPack unchanged. */
export function mockPart(id: number): Raster {
  const definition = partById(id),
    body = id < 2000;
  // Keep the existing fallback silhouettes and radii; this pass changes their paint only.
  const base = body
    ? ([7, 12.6, 22.5, 28.75, 39][(id % 10) - 1] ?? 18)
    : Math.max(8, Math.min(28, 8 + (definition?.gp ?? 1) * 3));
  const radius = body && id >= 1500 ? 32 : base,
    bounds = { x: -radius - 3, y: -radius - 3, width: radius * 2 + 6, height: radius * 2 + 6 };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(bounds.width * 2);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.scale(2, 2);
  ctx.translate(-bounds.x, -bounds.y);

  function bubble(x: number, y: number, r: number, warm?: WarmPalette, armored = false) {
    const fill = ctx.createRadialGradient(x - r * 0.18, y - r * 0.22, 0, x, y, r);
    if (warm) {
      fill.addColorStop(0, warm.light);
      fill.addColorStop(0.5, warm.middle);
      fill.addColorStop(1, warm.edge);
    } else {
      // Native bodies have a blue film, not an empty center. Keep enough translucency
      // to pick up the field beneath, with filled collision coverage throughout.
      fill.addColorStop(0, armored ? 'rgba(15,114,157,.64)' : 'rgba(15,140,190,.65)');
      fill.addColorStop(0.72, armored ? 'rgba(12,104,147,.65)' : 'rgba(15,137,187,.64)');
      fill.addColorStop(1, armored ? 'rgba(10,91,135,.7)' : 'rgba(11,119,165,.68)');
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = warm ? warm.rim : armored ? '#bdebf4' : '#e1fbff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (warm) {
      ctx.fillStyle = 'rgba(255,255,240,.88)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.36, y - r * 0.39, r * 0.19, r * 0.095, -0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
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
  }

  if (body && id >= 1500) for (let i = 0; i < 5; i++) bubble((i - 2) * 10, Math.sin(i) * 9, 8);
  else if (body) bubble(0, 0, radius, undefined, id >= 1100 && id < 1200);
  else {
    const palette =
      (id >= 4000 && id < 5000) || id >= 6000
        ? PALETTE.enemy
        : id >= 2000 && id < 3000
          ? PALETTE.primary
          : PALETTE.utility;
    bubble(-2, 0, base * 0.58, palette);
    bubble(base * 0.55, 0, base * 0.28, palette);
    if ((definition?.gp ?? 0) > 2) {
      bubble(-base * 0.5, -base * 0.45, base * 0.25, palette);
      bubble(-base * 0.5, base * 0.45, base * 0.25, palette);
    }
  }
  return {
    ...bounds,
    canvas,
    resolution: 2,
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    url: canvas.toDataURL('image/png'),
  };
}
