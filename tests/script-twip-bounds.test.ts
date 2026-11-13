import { expect, test } from 'bun:test';
import original from './fixtures/script-bounds-original.json';
import { AssetPack, type DisplayPlacement, type SwfMatrix } from '../src/game/assets/asset-pack';
import { scriptTwipBounds, type ScriptBoundsSource } from '../src/game/assets/projectile-bounds';
import { SwfClip } from '../src/game/assets/swf-clip';

const matrix = ([a, b, c, d, tx, ty]: number[]): SwfMatrix => ({ a, b, c, d, tx, ty });
const I = matrix([1, 0, 0, 1, 0, 0]);
const child = (charId: number, m: SwfMatrix, depth = 1): DisplayPlacement => ({
  charId,
  depth,
  frame: 1,
  bornFrame: 1,
  matrix: m,
});
const leaf = { x: -695.95, y: -695.95, width: 1391.9, height: 1391.9 };
const dimensions = (trace: string) => trace.split(' ').slice(2, 4).map(Number);

for (const [index, control] of original.cases.entries()) {
  test(`preserved original Script width/height control ${index}`, () => {
    const geometry: ScriptBoundsSource = {
      leafBounds: (id) => (id === 1541 ? leaf : undefined),
      displayList: (id) =>
        id === 1
          ? [
              {
                ...child(1541, matrix(control.inner)),
                color: { mult: [1, 1, 1, control.alpha], add: [0, 0, 0, 0] },
              },
            ]
          : [],
      childAge: () => 1,
    };
    const bounds = scriptTwipBounds(geometry, 1, 1, matrix(control.outer))!;
    expect([bounds.width, bounds.height]).toEqual(dimensions(control.trace));
    // Non-nested getBounds(parent) also exposes translated half-tie positions.
    if (index <= 5 || index === 11) {
      const [x, y, width, height] = control.trace.split(' ').slice(4).map(Number);
      expect(bounds).toEqual({ x, y, width, height });
    }
  });
}

test('all eight independently measured field scale widths retain leaf-before-union rounding', () => {
  const geometry: ScriptBoundsSource = {
    leafBounds: (id) => (id === 1541 ? leaf : undefined),
    displayList: () => [],
    childAge: () => 1,
  };
  const a = 0.9924774169921875;
  for (const [coefficient, width] of [
    [a, 1381.4],
    [0.5, 696],
    [1, 1391.9],
    [1.25, 1739.9],
    [2, 2783.8],
    [a * 0.5, 690.7],
    [a * 1.25, 1726.8],
    [a * 2, 2762.9],
  ]) {
    expect(
      scriptTwipBounds(geometry, 1541, 1, { ...I, a: coefficient, d: coefficient, tx: -1, ty: -1 })!
        .width,
    ).toBe(width);
  }
});

test('AssetPack retained clip boundary uses exact twips without mutating shared placements', () => {
  const placement = { ...child(1541, { ...I, a: 0.5, d: 0.5, tx: 1, ty: -1 }), clipDepth: 2 };
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    shapes: new Map([[1541, { bounds: original.originalLeafTwips }]]),
    sprites: new Map([[1542, { id: 1542, frameCount: 1, placements: [placement] }]]),
  });
  const pose = new SwfClip(1542, pack);
  pose.start();
  expect(pack.clipScriptTwipBounds(pose)).toEqual({
    x: -347.95,
    y: -348.05,
    width: 696,
    height: 696,
  });
  expect(pack.clipScriptBounds(pose)!.width).toBe(695.95);
  // Repeated retained-pose queries and other instances keep the source metadata intact.
  expect(pack.clipScriptTwipBounds(pose, { ...I, tx: -1, ty: 1 })).toEqual({
    x: -348,
    y: -348,
    width: 696,
    height: 696,
  });
  expect(placement.matrix).toEqual({ ...I, a: 0.5, d: 0.5, tx: 1, ty: -1 });
});

test('integer union survives distant leaves and preserves empty bounds separately from zero scale', () => {
  const geometry: ScriptBoundsSource = {
    leafBounds: (id) => (id === 1541 ? leaf : undefined),
    displayList: (id) =>
      id === 1
        ? [
            child(1541, { ...I, a: 0.5, d: 0.5, tx: 1 }),
            child(1541, { ...I, a: 0.5, d: 0.5, tx: 20001 }, 2),
          ]
        : [],
    childAge: () => 1,
  };
  expect(scriptTwipBounds(geometry, 1, 1)).toEqual({
    x: -347.95,
    y: -348,
    width: 1696,
    height: 696,
  });
  expect(scriptTwipBounds(geometry, 999, 1)).toBeUndefined();
  expect(scriptTwipBounds(geometry, 1541, 1, { ...I, a: 0, d: 0 })).toEqual({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
});
