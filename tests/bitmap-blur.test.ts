import { expect, test } from 'bun:test';
import reference from './fixtures/bitmap-blur-reference.json';
import {
  blurPauseBitmap,
  drawBitmapOver,
  PauseBitmapHistory,
  premultiplyBitmap,
  straightBitmap,
} from '../src/game/core/bitmap-blur';

function argbToStraight(values: number[]) {
  return new Uint8ClampedArray(
    values.flatMap((value) => [
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
      value >>> 24,
    ]),
  );
}
function scene(color = 0) {
  return argbToStraight(Array(81).fill(color));
}
function pixel(rgba: Uint8ClampedArray, x: number, y: number, argb: number) {
  rgba.set(argbToStraight([argb]), (y * 9 + x) * 4);
}
function matches(pixels: Uint8ClampedArray, name: keyof typeof reference.cases) {
  // getPixel32 exposes Flash's straight-color lookup; compare its reversible PMA bytes.
  expect([...pixels]).toEqual([...premultiplyBitmap(argbToStraight(reference.cases[name].flat()))]);
}

test('the scalar fractional box matches the reference grids with two recorded mixed-RGB rounding differences', () => {
  const rgba = scene();
  pixel(rgba, 4, 4, 0xffffffff);
  const white = premultiplyBitmap(rgba);
  blurPauseBitmap(white, 9, 9);
  matches(white, 'white1');
  const saved = white.slice();
  blurPauseBitmap(white, 9, 9);
  matches(white, 'white2');
  drawBitmapOver(white, saved);
  matches(white, 'history');
  const solid = premultiplyBitmap(scene(0xff123456));
  blurPauseBitmap(solid, 9, 9);
  matches(solid, 'solid');
  const semi = scene();
  pixel(semi, 4, 4, 0x80ff4000);
  pixel(semi, 5, 4, 0x400080ff);
  const mixed = premultiplyBitmap(semi);
  blurPauseBitmap(mixed, 9, 9);
  const measured = premultiplyBitmap(argbToStraight(reference.cases.semi.flat()));
  const differences = [...mixed].flatMap((value, i) =>
    value === measured[i]
      ? []
      : [{ pixel: Math.floor(i / 4), channel: i % 4, scalar: value, measured: measured[i] }],
  );
  // All alpha bytes and every other RGB byte match. Preserve the actual GPU observation;
  // a uniform sampler-weight change worsens it, and Adobe comparison remains unproven.
  expect(differences).toEqual([
    { pixel: 40, channel: 0, scalar: 16, measured: 15 },
    { pixel: 41, channel: 2, scalar: 7, measured: 6 },
  ]);
  const corner = scene();
  pixel(corner, 0, 0, 0xffffffff);
  const edge = premultiplyBitmap(corner);
  blurPauseBitmap(edge, 9, 9);
  matches(edge, 'edge');
});

test('pause saves before every second blur and the unused first reverse slot leaves the image unchanged', () => {
  const rgba = scene();
  pixel(rgba, 4, 4, 0xffffffff);
  const history = new PauseBitmapHistory(9, 9, rgba);
  expect(history.advance(1, false)).toBe(false);
  expect(history.advance(2, false)).toBe(true);
  matches(history.pixels, 'white1');
  history.advance(3, false);
  history.advance(4, false);
  matches(history.pixels, 'white2');
  history.advance(5, false);
  const before = history.pixels.slice();
  history.advance(4, true);
  expect(history.pixels).toEqual(before);
  expect(history.index).toBe(1);
  history.advance(3, true);
  history.advance(2, true);
  matches(history.pixels, 'history');
  expect(history.savedFrames).toBe(2);
});

test('full opaque captures restore exactly, stay unchanged while idle, and keep a bounded19-frame history', () => {
  const rgba = scene(0xff123456),
    history = new PauseBitmapHistory(9, 9, rgba);
  for (let frame = 1; frame <= 39; frame++) history.advance(frame, false);
  expect(history.savedFrames).toBe(19);
  const blurred = history.pixels.slice();
  for (let i = 0; i < 100; i++) history.advance(39, false);
  expect(history.pixels).toEqual(blurred);
  for (let frame = 38; frame >= 0; frame--) history.advance(frame, true);
  expect(straightBitmap(history.pixels)).toEqual(rgba);
  history.dispose();
  expect(history.retainedBytes).toBe(0);
  expect(history.advance(2, false)).toBe(false);
});
