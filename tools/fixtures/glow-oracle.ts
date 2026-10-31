import type { SwfGlowFilter } from '../../src/game/assets/asset-pack';
import type { SwfColorTransform } from '../../src/game/assets/swf-color-transform';

/** Independent byte-image oracle from the pinned WGPU formulas, never shipped in the game. */
export function premultiply(data: Uint8ClampedArray) {
  const result = new Uint8ClampedArray(data);
  for (let i = 0; i < result.length; i += 4)
    for (let c = 0; c < 3; c++) result[i + c] = Math.round((data[i + c] * data[i + 3]) / 255);
  return result;
}
function box(alpha: Uint8Array, width: number, height: number, size: number, vertical: boolean) {
  size = Math.min(255, size);
  if (size <= 1) return alpha;
  const radius = (size - 1) / 2,
    extent = Math.ceil(radius),
    m = extent - 1,
    edge = Math.floor((radius - m) * 255) / 255,
    count = vertical ? height : width,
    lines = vertical ? width : height,
    result = new Uint8Array(alpha.length);
  const index = (line: number, n: number) => (vertical ? n * width + line : line * width + n);
  for (let line = 0; line < lines; line++) {
    const prefix = new Float64Array(count + 1);
    for (let n = 0; n < count; n++) prefix[n + 1] = prefix[n] + alpha[index(line, n)];
    const read = (n: number) => (n >= 0 && n < count ? alpha[index(line, n)] : 0);
    for (let n = 0; n < count; n++) {
      const center = prefix[Math.min(count, n + m + 1)] - prefix[Math.max(0, n - m)];
      result[index(line, n)] = Math.floor(
        (center + edge * (read(n - extent) + read(n + extent))) / size,
      );
    }
  }
  return result;
}
export function oracleGlow(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  f: SwfGlowFilter,
) {
  let alpha: Uint8Array = Uint8Array.from({ length: width * height }, (_, i) => source[i * 4 + 3]);
  for (let p = 0; p < f.passes; p++) {
    alpha = box(alpha, width, height, f.blurX, false);
    alpha = box(alpha, width, height, f.blurY, true);
  }
  const result = new Uint8ClampedArray(source.length);
  for (let i = 0; i < width * height; i++) {
    const a = source[i * 4 + 3] / 255,
      b = alpha[i] / 255,
      t = (f.color[3] / 255) * Math.max(0, Math.min(1, (f.inner ? 1 - b : b) * f.strength));
    for (let c = 0; c < 4; c++) {
      const g = (c === 3 ? 255 : f.color[c]) * t,
        d = source[i * 4 + c];
      result[i * 4 + c] = Math.round(
        f.inner
          ? g * a + (!f.knockout && f.compositeSource ? d * (1 - t) : 0)
          : f.knockout
            ? g * (1 - a)
            : f.compositeSource
              ? g * (1 - a) + d
              : g,
      );
    }
  }
  return result;
}
export function oracleColor(source: Uint8ClampedArray, f: SwfColorTransform) {
  const result = new Uint8ClampedArray(source.length);
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  for (let i = 0; i < source.length; i += 4) {
    const a = source[i + 3];
    if (!a) continue;
    const nextAlpha = clamp(a * f.mult[3] + f.add[3]);
    result[i + 3] = Math.round(nextAlpha);
    for (let c = 0; c < 3; c++)
      result[i + c] = Math.round(
        (clamp(((source[i + c] * 255) / a) * f.mult[c] + f.add[c]) * nextAlpha) / 255,
      );
  }
  return result;
}
