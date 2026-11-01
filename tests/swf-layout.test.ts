import { expect, test } from 'bun:test';
import { createSwfLayout } from '../tools/lib/swf-layout';
import type { SymbolResult, SpriteInfo } from '../src/game/assets/asset-pack';

const identity = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const morph = {
  id: 1,
  startBounds: { xMin: 0, yMin: 0, xMax: 40, yMax: 40 },
  endBounds: { xMin: 20, yMin: 20, xMax: 80, yMax: 80 },
  fills: [{ kind: 'solid', start: [0, 0, 0, 0], end: [200, 100, 50, 200] }],
  lines: [{ startWidth: 20, endWidth: 60, start: [0, 0, 0, 0], end: [200, 100, 50, 200] }],
  runs: [{ f0: 0, f1: 1, line: 1, start: [0, 0], ops: [['L', 40, 40]] }],
  endRuns: [{ start: [20, 20], ops: [['L', 80, 80]] }],
};
function layout(sprites: SpriteInfo[] = []) {
  return createSwfLayout({
    shapes: [],
    texts: [],
    fonts: [],
    buttons: [],
    morphs: [morph],
    sprites,
  } as unknown as SymbolResult['symbols']);
}
test('numeric layout retains morph bounds/styles at default, middle and end ratios without paths', () => {
  const importer = layout(),
    start = importer.collect(1, 1, 'up'),
    middle = importer.collect(1, 1, 'up', identity, 32767.5),
    end = importer.collect(1, 1, 'up', identity, 65535);
  expect(start).toHaveLength(1);
  expect(start[0].bounds).toEqual(morph.startBounds);
  expect(middle[0]).toMatchObject({
    bounds: { xMin: 10, yMin: 10, xMax: 60, yMax: 60 },
    fill: [100, 50, 25, 100],
    stroke: { color: [100, 50, 25, 100], width: 2 },
  });
  expect(end[0]).toMatchObject({
    bounds: morph.endBounds,
    fill: [200, 100, 50, 200],
    stroke: { width: 3 },
  });
  expect(Object.keys(middle[0]).sort()).toEqual([
    'bounds',
    'fill',
    'id',
    'kind',
    'matrix',
    'stroke',
  ]);
});
test('numeric layout follows retained morph-ratio moves and keeps the ratio through matrix-only moves', () => {
  const importer = layout([
    {
      id: 10,
      frameCount: 3,
      placements: [
        { frame: 1, depth: 1, charId: 1, matrix: { ...identity, tx: 40, ty: 20 }, ratio: 0 },
        { frame: 2, depth: 1, ratio: 65535 },
        { frame: 3, depth: 1, matrix: { ...identity, tx: 60, ty: 40 } },
      ],
    },
  ]);
  expect(importer.bounds(importer.collect(10, 1, 'up'))).toEqual({
    x: 2,
    y: 1,
    width: 2,
    height: 2,
  });
  expect(importer.bounds(importer.collect(10, 2, 'up'))).toEqual({
    x: 3,
    y: 2,
    width: 3,
    height: 3,
  });
  expect(importer.bounds(importer.collect(10, 3, 'up'))).toEqual({
    x: 4,
    y: 3,
    width: 3,
    height: 3,
  });
});
test('numeric layout composes parent and child matrices before bounding the morphed leaf', () => {
  const parent = { a: 0, b: 2, c: -3, d: 0, tx: 100, ty: 200 },
    child = { a: 2, b: 0, c: 0, d: 0.5, tx: 40, ty: 60 },
    importer = layout([
      { id: 11, frameCount: 1, placements: [{ frame: 1, depth: 1, charId: 12, matrix: child }] },
      {
        id: 12,
        frameCount: 1,
        placements: [{ frame: 1, depth: 1, charId: 1, matrix: identity, ratio: 65535 }],
      },
    ]),
    matrix = { a: 0, b: 4, c: -1.5, d: 0, tx: -80, ty: 280 };
  expect(importer.multiply(parent, child)).toEqual(matrix);
  const leaves = importer.collect(11, 1, 'up', parent);
  expect(leaves[0].matrix).toEqual(matrix);
  expect(importer.bounds(leaves)).toEqual({ x: -10, y: 18, width: 4.5, height: 12 });
});
