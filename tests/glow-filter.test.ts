import { expect, test } from 'bun:test';
import { glowKernel, glowPadding } from '../src/game/assets/glow-kernel';
import {
  composeColor,
  fixedColorMultiplier,
  IDENTITY_COLOR,
} from '../src/game/assets/swf-color-transform';
import type { SwfGlowFilter } from '../src/game/assets/asset-pack';

test('box kernels retain fractional edge quantization, no-op axes and the255px cap', () => {
  for (const n of [-4, 0, 0.5, 1]) expect(glowKernel(n)).toBeUndefined();
  expect(glowKernel(5)).toEqual({ size: 5, extent: 2, edge: 1 });
  expect(glowKernel(6)).toEqual({ size: 6, extent: 3, edge: 127 / 255 });
  expect(glowKernel(5.5)).toEqual({ size: 5.5, extent: 3, edge: 63 / 255 });
  expect(glowKernel(300)).toEqual({ size: 255, extent: 127, edge: 1 });
});
test('filter padding follows repeated-pass growth with twip truncation before outward pixel rounding', () => {
  const f = { blurX: 5, blurY: 0, passes: 1 } as SwfGlowFilter;
  expect(glowPadding(f)).toBe(5);
  expect(glowPadding({ ...f, passes: 2 })).toBe(11);
  expect(glowPadding({ ...f, passes: 3 })).toBe(14);
  expect(glowPadding({ ...f, blurX: 5.0000152587890625 })).toBe(5);
});
test('native CT concatenation uses signed Fixed8 multiply and signed integer offsets', () => {
  const parent = { mult: [202 / 256, 0.5, -0.5, 0.5], add: [0, 115, 20, 0] };
  const child = { mult: [95 / 256, 2, 3, 1], add: [1, 40, 3, 0] };
  expect(composeColor(parent, child)).toEqual({
    mult: [74 / 256, 1, -1.5, 0.5],
    add: [0, 135, 18, 0],
  });
  expect(composeColor(IDENTITY_COLOR, child)).toEqual(child);
  expect(fixedColorMultiplier(0.7899)).toBe(202 / 256);
  expect(fixedColorMultiplier(-0.1)).toBe(-25 / 256);
});
test('CT wrapping preserves source overflow instead of clamping the concatenated transform', () => {
  const extreme = { mult: [127, -128, 1, 1], add: [32767, -32768, 0, 0] };
  expect(composeColor(extreme, { mult: [2, 2, 1, 1], add: [2, 1, 0, 0] })).toEqual({
    mult: [-2, 0, 1, 1],
    add: [-32515, 32640, 0, 0],
  });
});
