import type { AssetPack } from '../../src/game/assets/asset-pack';
import type { Projectile } from '../../src/game/core/types';

/** Compare the synchronous frame path with the browser's independent SVG rasterizer. */
export async function showMorphProof(pack: AssetPack, host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 550;
  canvas.height = 450;
  host.replaceChildren(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#123e51';
  ctx.fillRect(0, 0, 550, 450);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#dffaff';
  for (const [index, ratio] of [0, 32768, 65535].entries())
    ctx.fillText(`${Math.round(ratio / 655.35)}%`, 90 + index * 175, 18);
  let samples = 0,
    maxMeanError = 0;
  const errors: { id: number; ratio: number; mean: number }[] = [];
  for (const [row, id] of [2002, 2047, 2059, 2196, 2208, 2292].entries()) {
    for (const [column, ratio] of [0, 32768, 65535].entries()) {
      const actual = pack.morphRaster(id, ratio)!,
        expected = (await pack.rasterSymbol(id, 1, ratio))!;
      if (
        actual.canvas.width !== expected.canvas.width ||
        actual.canvas.height !== expected.canvas.height
      )
        throw new Error(`Morph ${id} bounds disagree with SVG`);
      let error = 0;
      for (let i = 0; i < actual.pixels.length; i++)
        error += Math.abs(actual.pixels[i] - expected.pixels[i]);
      maxMeanError = Math.max(maxMeanError, error / actual.pixels.length);
      errors.push({ id, ratio, mean: error / actual.pixels.length });
      samples++;
      const scale = Math.min(1, 70 / actual.width, 52 / actual.height);
      const w = actual.width * scale,
        h = actual.height * scale;
      ctx.drawImage(actual.canvas, 65 + column * 175 - w / 2, 27 + row * 69 + (52 - h) / 2, w, h);
      ctx.drawImage(
        expected.canvas,
        140 + column * 175 - w / 2,
        27 + row * 69 + (52 - h) / 2,
        w,
        h,
      );
    }
    ctx.fillText(String(id), 8, 58 + row * 69);
  }
  const bullet: Projectile = {
    uid: 1,
    owner: 1,
    enemy: false,
    kind: 'shell',
    x: 0,
    y: 0,
    angle: 0,
    heading: 0,
    speed: 0,
    damage: 0,
    radius: 0,
    age: 1,
    life: 100,
    explode: 0,
    targetId: null,
    hit: new Set(),
    dead: false,
    symbol: 2004,
    orbit: 0,
  };
  const first = pack.hitProjectile(bullet, 0, -70) && !pack.hitProjectile(bullet, 0, -4);
  bullet.age = 19;
  const last = !pack.hitProjectile(bullet, 0, -70) && pack.hitProjectile(bullet, 0, -4);
  return {
    samples,
    maxMeanError,
    pixelCache: pack.morphCachePixels,
    nestedMaskMoves: first && last,
    errors,
  };
}
