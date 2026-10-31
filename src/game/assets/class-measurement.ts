import type { TankDesign } from '../core/types';
import { classFromPixelCount } from '../simulation/designer';
import type { AssetPack } from './asset-pack';

/** TankCreatorScreen.UpdateClass / TankData._-7e: body-only, opaque black BitmapData. */
export function captureClass(design: TankDesign, pack: AssetPack) {
  const bodies = design.parts.filter((p) => p.type < 2000);
  const points = bodies.flatMap((p) => {
    const b = pack.classBodyBounds(p);
    return b
      ? [
          { x: b.x, y: b.y },
          { x: b.x + b.width, y: b.y + b.height },
        ]
      : [];
  });
  const x = points.length ? Math.min(...points.map((p) => p.x)) : 0,
    y = points.length ? Math.min(...points.map((p) => p.y)) : 0;
  const bounds = {
    x,
    y,
    width: points.length ? Math.max(...points.map((p) => p.x)) - x : 0,
    height: points.length ? Math.max(...points.map((p) => p.y)) - y : 0,
  };
  const canvas = document.createElement('canvas');
  // BitmapData's integer dimensions truncate; fractional drawing translation remains.
  canvas.width = Math.max(1, Math.trunc(bounds.width + 10));
  canvas.height = Math.max(1, Math.trunc(bounds.height + 10));
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(5 - x, 5 - y);
  for (const p of bodies) pack.drawPart(ctx, p, 'class');
  const bytes = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let pixels = 0;
  for (let i = 0; i < bytes.length; i += 4) if (bytes[i] || bytes[i + 1] || bytes[i + 2]) pixels++;
  return { canvas, bounds, pixels, classId: classFromPixelCount(pixels) };
}

export function measureClass(design: TankDesign, pack: AssetPack) {
  return captureClass(design, pack).classId;
}
