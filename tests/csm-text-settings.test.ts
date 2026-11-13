import { expect, test } from 'bun:test';
import { extractSymbols, parseCSMTextSettingsTag } from '../src/game/assets/swf-symbols.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';

test('CSMTextSettings retains the declared mode, three-bit grid fit and signed little-endian floats from a tag slice', () => {
  // ID0x1234; advanced renderer1, subpixel grid2; thickness-2.5, sharpness0.75.
  // Padding verifies that DataView respects the body's byteOffset.
  const source = Uint8Array.from([
    255, 255, 0x34, 0x12, 0x50, 0, 0, 0x20, 0xc0, 0, 0, 0x40, 0x3f, 0, 255,
  ]);
  expect(parseCSMTextSettingsTag(source.subarray(2, 14))).toEqual({
    id: 0x1234,
    useFlashType: 1,
    gridFit: 2,
    thickness: -2.5,
    sharpness: 0.75,
  });
  // Preserve unsupported packed values for explicit provider handling, not a
  // guessed normal/advanced fallback or a two-bit grid-fit truncation.
  const reserved = Uint8Array.from([1, 0, 0xf8, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  expect(parseCSMTextSettingsTag(reserved)).toMatchObject({ useFlashType: 3, gridFit: 7 });
});

test('CSMTextSettings preserves signed zero and rejects missing tag bytes', () => {
  const body = Uint8Array.from([1, 0, 0, 0, 0, 0, 0x80, 0, 0, 0, 0, 0]);
  expect(Object.is(parseCSMTextSettingsTag(body).thickness, -0)).toBe(true);
  expect(Object.is(parseCSMTextSettingsTag(body).sharpness, 0)).toBe(true);
  expect(() => parseCSMTextSettingsTag(body.subarray(0, 11))).toThrow('truncated CSMTextSettings');
});

test('the symbol inventory retains CSM settings in file order, including independent text IDs and repeated controls', async () => {
  // Minimal uncompressed movie, zero RECT,50fps/one frame; each74 record has12bytes.
  const tagHeader = (74 << 6) | 12,
    first = [9, 0, 0x40, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    second = [10, 0, 0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tags = [first, second, first].flatMap((body) => [tagHeader & 255, tagHeader >> 8, ...body]),
    bytes = Uint8Array.from([70, 87, 83, 10, 0, 0, 0, 0, 0, 0, 50, 1, 0, ...tags, 0, 0]);
  new DataView(bytes.buffer).setUint32(4, bytes.length, true);
  const { symbols, errors } = (await extractSymbols(bytes, {
    svg: false,
  })) as unknown as SymbolResult;
  expect(errors).toEqual([]);
  expect(symbols.csmTextSettings).toEqual([
    { id: 9, useFlashType: 1, gridFit: 0, thickness: 0, sharpness: 0 },
    { id: 10, useFlashType: 0, gridFit: 2, thickness: 0, sharpness: 0 },
    { id: 9, useFlashType: 1, gridFit: 0, thickness: 0, sharpness: 0 },
  ]);
});
