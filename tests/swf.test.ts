import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decompressSWF, readHeader } from '../src/game/assets/swf.mjs';
import {
  extractSymbols,
  morphShapeAtRatio,
  parseSpriteTag,
  parseEditTextTag,
  shapeToSVG,
} from '../src/game/assets/swf-symbols.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const file =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
test('DefineEditText reads signed little-endian leading without consuming the variable name', () => {
  for (const leading of [0, 40, -40, 256, -256, 32767, -32768]) {
    const result = parseEditTextTag(
      Uint8Array.from([
        1,
        0,
        0x08,
        0x00,
        0,
        0x20,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        leading & 255,
        (leading >> 8) & 255,
        120,
        0,
      ]),
    );
    expect(result).toMatchObject({ leading, variableName: 'x', align: 0, margins: [0, 0, 0] });
  }
});
test('PlaceObject3 reads both flag bytes before depth and keeps removal events', () => {
  // DefineSprite header; PlaceObject3 len 6: HasCharacter, flags2=0, depth513, cid729.
  const code = (70 << 6) | 6;
  const remove = (28 << 6) | 2;
  const body = Uint8Array.from([
    5,
    0,
    1,
    0,
    code & 255,
    code >> 8,
    2,
    0,
    1,
    2,
    217,
    2,
    remove & 255,
    remove >> 8,
    1,
    2,
    64,
    0,
    0,
    0,
  ]);
  const sprite = parseSpriteTag(body);
  expect(sprite.placements[0]).toMatchObject({ depth: 513, charId: 729, frame: 1 });
  expect(sprite.placements[1]).toMatchObject({ depth: 513, remove: true, frame: 1 });
});
test('PlaceObject3 retains ERASE and cache flags rather than discarding composition metadata', () => {
  const tag = (70 << 6) | 8;
  const sprite = parseSpriteTag(
    Uint8Array.from([5, 0, 1, 0, tag & 255, tag >> 8, 2, 6, 4, 0, 21, 8, 12, 1, 64, 0, 0, 0]),
  );
  expect(sprite.placements[0]).toMatchObject({
    depth: 4,
    charId: 2069,
    blendMode: 12,
    cacheAsBitmap: 1,
  });
});
test('PlaceObject3 retains knockout glow flags and consumes the following blend byte correctly', () => {
  const placement = [
    2, 7, 1, 0, 20, 8, 1, 2, 255, 0, 0, 255, 0, 0, 10, 0, 0, 0, 10, 0, 0, 1, 0x61, 12, 1,
  ];
  const tag = (70 << 6) | placement.length;
  const sprite = parseSpriteTag(
    Uint8Array.from([5, 0, 1, 0, tag & 255, tag >> 8, ...placement, 64, 0, 0, 0]),
  );
  expect(sprite.placements[0]).toMatchObject({
    charId: 2068,
    blendMode: 12,
    cacheAsBitmap: 1,
    filters: [
      {
        kind: 'glow',
        color: [255, 0, 0, 255],
        blurX: 10,
        blurY: 10,
        strength: 1,
        inner: false,
        knockout: true,
        compositeSource: true,
        passes: 1,
      },
    ],
  });
});
test('fill-left fragments reverse and join; same-fill internal edges are omitted', () => {
  const svg = shapeToSVG(
    {
      id: 1,
      bounds: { xMin: 0, yMin: 0, xMax: 20, yMax: 20 },
      fills: [{ kind: 'solid', color: [255, 0, 0, 255] }],
      lines: [],
      runs: [
        { f0: 0, f1: 1, line: 0, start: [0, 0], ops: [['L', 20, 0]] },
        { f0: 1, f1: 0, line: 0, start: [20, 20], ops: [['L', 20, 0]] },
        {
          f0: 0,
          f1: 1,
          line: 0,
          start: [20, 20],
          ops: [
            ['L', 0, 20],
            ['L', 0, 0],
          ],
        },
        { f0: 1, f1: 1, line: 0, start: [0, 0], ops: [['L', 20, 20]] },
      ],
    },
    new Map(),
  );
  expect(svg).toContain('M0 0 L1 0 L1 1 L0 1 L0 0 Z');
  expect(svg.match(/<path/g)).toHaveLength(1);
});
test('morphs interpolate styles and pair edges across different run boundaries', () => {
  const morph = {
    id: 1,
    startBounds: { xMin: 0, yMin: 0, xMax: 40, yMax: 40 },
    endBounds: { xMin: 20, yMin: 20, xMax: 80, yMax: 80 },
    fills: [{ kind: 'solid', start: [0, 0, 0, 0], end: [200, 100, 50, 200] }],
    lines: [{ startWidth: 20, endWidth: 60, start: [0, 0, 0, 0], end: [200, 100, 50, 200] }],
    runs: [
      { f0: 0, f1: 1, line: 1, start: [0, 0], ops: [['L', 40, 0]] },
      { f0: 0, f1: 1, line: 1, start: [40, 0], ops: [['L', 40, 40]] },
    ],
    endRuns: [
      {
        start: [20, 20],
        ops: [
          ['Q', 50, 0, 80, 20],
          ['L', 80, 80],
        ],
      },
    ],
  };
  const mid = morphShapeAtRatio(morph, 32767.5);
  expect(mid.bounds).toEqual({ xMin: 10, yMin: 10, xMax: 60, yMax: 60 });
  expect(mid.fills[0].color).toEqual([100, 50, 25, 100]);
  expect(mid.lines[0].width).toBe(40);
  expect(mid.runs[0].start).toEqual([10, 10]);
  expect(mid.runs[0].ops).toEqual([['Q', 35, 0, 60, 10]]);
  expect(mid.runs[1].start).toEqual([60, 10]);
  expect(mid.runs[1].f1).toBe(1);
  expect(mid.runs[1].ops).toEqual([['L', 60, 60]]);
});
test.skipIf(!existsSync(file))(
  'reference SWF decodes all definitions, original fonts, vectors and correct field depths',
  async () => {
    const { bytes } = await decompressSWF(new Uint8Array(readFileSync(file)));
    expect(readHeader(bytes)).toMatchObject({
      stageWidthPx: 550,
      stageHeightPx: 450,
      frameRate: 50,
    });
    const { symbols, svgByCid, errors } = (await extractSymbols(bytes)) as unknown as SymbolResult;
    expect(errors).toEqual([]);
    expect(svgByCid.size).toBe(1071);
    expect(symbols.morphs).toHaveLength(55);
    for (const morph of symbols.morphs) {
      expect(morph.fills.length + morph.lines.length).toBeGreaterThan(0);
      for (const ratio of [0, 16384, 32768, 49152, 65535]) {
        const svg = shapeToSVG(morphShapeAtRatio(morph, ratio), undefined);
        expect(svg).not.toContain('NaN');
        expect(svg).toContain('<path');
      }
    }
    const splash = symbols.morphs.find((morph) => morph.id === 2196)!;
    expect(splash.fills[0].stops[1].endRatio).toBe(94);
    const midway = morphShapeAtRatio(splash, 32767.5);
    expect(midway.fills[0].stops[1].ratio).toBe(130);
    expect(midway.fills[0].stops[1].color[3]).toBe(73);
    expect(shapeToSVG(midway, undefined)).toContain('matrix(0.06143951');
    expect(symbols.sprites.find((s) => s.id === 1551)?.placements[0]).toMatchObject({
      depth: 1,
      charId: 1537,
      name: 'BF_BG_mc',
    });
    const billo = symbols.fonts.find((f) => f.id === 361)!;
    expect(billo.glyphs.length).toBe(114);
    expect(billo.advances!.every((n) => n >= 0 && n < 32768)).toBe(true);
    expect(svgByCid.get(542)).toContain('viewBox="0 0');
    expect(svgByCid.get(359)).toContain('M216.1 30.05');
    // FFDec 683.svg has a red layer followed by a blue layer, each with its own outline.
    const layered = svgByCid.get(683)!;
    expect(layered).toContain('#d92626');
    expect(layered).toContain('#0781b4');
    expect(layered.indexOf('stroke="#ffffff"')).toBeLessThan(layered.indexOf('#0781b4'));
    const muzzle = symbols.sprites
      .find((s) => s.id === 729)!
      .placements.find((p) => p.name === '_-Vk');
    expect(muzzle?.color?.mult[3]).toBe(0);
    expect(symbols.sprites.find((s) => s.id === 2069)!.placements[0]).toMatchObject({
      charId: 2068,
      filters: [
        {
          kind: 'glow',
          color: [255, 0, 0, 255],
          blurX: 10,
          blurY: 10,
          strength: 1,
          inner: false,
          knockout: true,
          compositeSource: true,
          passes: 1,
        },
      ],
    });
    const reflection = symbols.sprites.find((s) => s.id === 1537)!.placements[0].matrix!;
    expect(reflection.b).toBeLessThan(0);
    expect(reflection.c).toBeGreaterThan(0);
    expect(symbols.texts.find((t) => t.id === 1632)!.records[0].y).toBe(440);
  },
);
