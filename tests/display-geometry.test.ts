import { expect, test } from 'bun:test';
import {
  displayGeometryBounds,
  displayGeometryHit,
  displayGeometryHitTestPoint,
  type DisplayGeometryNode,
} from '../src/game/core/display-geometry';
import { DISPLAY_IDENTITY, type DisplayMatrix } from '../src/game/core/display-transform';
import original from './fixtures/script-bounds-original.json';

const matrix = ([a, b, c, d, tx, ty]: number[]): DisplayMatrix => ({ a, b, c, d, tx, ty });
const rectangle = (
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
): DisplayGeometryNode => ({
  matrix: DISPLAY_IDENTITY,
  content: {
    kind: 'leaf',
    bounds: { xMin, xMax, yMin, yMax },
    // Synthetic rectangular fill, not an approximation of original field art.
    hit: ({ x, y }) => x * 20 >= xMin && x * 20 <= xMax && y * 20 >= yMin && y * 20 <= yMax,
  },
});
const group = (
  children: DisplayGeometryNode[],
  transform = DISPLAY_IDENTITY,
): DisplayGeometryNode => ({
  matrix: transform,
  content: { kind: 'container', children },
});

test('geometry-tree Script traversal matches all independently frozen original bounds controls', () => {
  for (const control of original.cases) {
    const leaf = rectangle(-13919, -13919, 13919, 13919),
      tree = group([group([leaf], matrix(control.inner))], matrix(control.outer)),
      bounds = displayGeometryBounds(tree)!,
      [width, height] = control.trace.split(' ').slice(2, 4).map(Number);
    expect([bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin]).toEqual([
      width * 20,
      height * 20,
    ]);
  }
});

test('overlapping depth masks use the original mutable latch rather than conjunction', () => {
  const mask1 = { ...rectangle(0, 0, 400, 400), depth: 1, clipDepth: 6 },
    mask2 = { ...rectangle(200, 0, 600, 400), depth: 2, clipDepth: 6 },
    target = { ...rectangle(0, 0, 1000, 1000), depth: 4 },
    tree = group([mask1, mask2, target]);
  expect(displayGeometryHit(tree, { x: 5, y: 5 })).toBe(false);
  expect(displayGeometryHit(tree, { x: 15, y: 5 })).toBe(true);
  expect(displayGeometryHit(tree, { x: 25, y: 5 })).toBe(true);
  // A later mask hit resets a preceding miss; exact end depth is admitted.
  expect(displayGeometryHit(group([mask1, { ...target, depth: 6 }]), { x: 25, y: 5 })).toBe(true);
  expect(displayGeometryHit(group([mask1, mask2]), { x: 15, y: 5 })).toBe(false);
  // Masks and the fully unclipped target still contribute to Script width.
  expect(displayGeometryBounds(tree)).toEqual({ xMin: 0, xMax: 1000, yMin: 0, yMax: 1000 });
});

test('runtime children beyond mask depths and nested children inherit the correct mask scope', () => {
  const mask = { ...rectangle(0, 0, 200, 200), depth: 1, clipDepth: 4 },
    target = rectangle(400, 0, 600, 200),
    masked = { ...group([target]), depth: 2 };
  expect(displayGeometryHit(group([mask, masked]), { x: 25, y: 5 })).toBe(false);
  expect(displayGeometryHit(group([mask, { ...masked, depth: 5 }]), { x: 25, y: 5 })).toBe(true);
  expect(displayGeometryHit(group([mask, target]), { x: 25, y: 5 })).toBe(true);
});

test('parent-to-stage Points affect shape contact but never leak into the clip Script bounds', () => {
  const leaf = rectangle(0, 0, 200, 200),
    tree = group([leaf], { ...DISPLAY_IDENTITY, tx: 201, ty: -101 }),
    parent = { ...DISPLAY_IDENTITY, a: 0.5, d: 0.5, tx: 5500, ty: 4500 };
  expect(displayGeometryHit(tree, { x: 282, y: 225 }, parent)).toBe(true);
  expect(displayGeometryHit(tree, { x: 282, y: 225 })).toBe(false);
  expect(displayGeometryHit(tree, { x: 12, y: -3 })).toBe(true);
  expect(displayGeometryBounds(tree)).toEqual({ xMin: 201, xMax: 401, yMin: -101, yMax: 99 });
});

test('public-query callers select argument ancestry independently of receiver ancestry and stage attachment', () => {
  const leaf = rectangle(0, 0, 200, 200),
    origin = { ...DISPLAY_IDENTITY, tx: 20000, ty: -10000 },
    receiver = { node: leaf, onStage: true, parentToStage: origin, argumentToStage: origin };
  // An explicit root-relative argument reaches the attached leaf's local centre.
  // This is an adapter control, not evidence that the loaded player uses this mapping.
  expect(displayGeometryHitTestPoint(receiver, { x: 5, y: 5 })).toBe(true);
  expect(
    displayGeometryHitTestPoint({ ...receiver, argumentToStage: DISPLAY_IDENTITY }, { x: 5, y: 5 }),
  ).toBe(false);
  expect(displayGeometryHitTestPoint({ ...receiver, onStage: false }, { x: 5, y: 5 })).toBe(false);
  expect(displayGeometryBounds(leaf)).toEqual({ xMin: 0, xMax: 200, yMin: 0, yMax: 200 });
});

test('leaf contact receives actual stage-to-leaf scale for minimum stroke width', () => {
  const seen: unknown[] = [],
    leaf: DisplayGeometryNode = {
      matrix: { ...DISPLAY_IDENTITY, a: 0.5, d: 0.25 },
      content: {
        kind: 'leaf',
        bounds: { xMin: -20, yMin: -20, xMax: 20, yMax: 20 },
        hit: (point, inverse) => {
          seen.push({ point, inverse });
          return true;
        },
      },
    };
  expect(displayGeometryHit(leaf, { x: 0.5, y: 0.5 })).toBe(true);
  expect(seen).toEqual([
    { point: { x: 1, y: 2 }, inverse: { a: 2, b: -0, c: -0, d: 4, tx: -0, ty: 0 } },
  ]);
});

test('empty geometry stays distinct from a zero-scaled nonempty leaf', () => {
  expect(
    displayGeometryBounds({ matrix: DISPLAY_IDENTITY, content: { kind: 'empty' } }),
  ).toBeUndefined();
  const leaf = { ...rectangle(-20, -20, 20, 20), matrix: { ...DISPLAY_IDENTITY, a: 0, d: 0 } };
  expect(displayGeometryBounds(leaf)).toEqual({ xMin: 0, xMax: 0, yMin: 0, yMax: 0 });
});

test('authored hidden masks block while hidden ordinary targets keep geometry', () => {
  const mask = { ...rectangle(0, 0, 200, 200), depth: 1, clipDepth: 4, visible: false },
    target = { ...rectangle(0, 0, 200, 200), depth: 2, visible: false };
  expect(displayGeometryHit(group([mask, target]), { x: 5, y: 5 })).toBe(false);
  expect(displayGeometryHit(group([{ ...mask, visible: true }, target]), { x: 5, y: 5 })).toBe(
    true,
  );
  expect(displayGeometryHit(mask, { x: 5, y: 5 })).toBe(true);
});

test('runtime masks stay geometric references across separate parents and are excluded as ordinary content', () => {
  const mask = { ...rectangle(0, 0, 200, 200), isRuntimeMask: true, visible: false },
    target = {
      ...rectangle(0, 0, 1000, 1000),
      runtimeMask: { node: mask, parentToStage: DISPLAY_IDENTITY },
    };
  expect(displayGeometryHit(mask, { x: 5, y: 5 })).toBe(false);
  expect(displayGeometryHit(target, { x: 5, y: 5 })).toBe(true);
  expect(displayGeometryHit(target, { x: 25, y: 5 })).toBe(false);
  const shifted = {
    ...target,
    runtimeMask: { node: mask, parentToStage: { ...DISPLAY_IDENTITY, tx: 400 } },
  };
  expect(displayGeometryHit(shifted, { x: 5, y: 5 })).toBe(false);
  expect(displayGeometryHit(shifted, { x: 25, y: 5 })).toBe(true);
  // Mask references do not invent physical bounds at the target's parent.
  expect(displayGeometryBounds(shifted)).toEqual({ xMin: 0, yMin: 0, xMax: 1000, yMax: 1000 });
  expect(displayGeometryBounds(group([mask]))).toEqual({ xMin: 0, yMin: 0, xMax: 200, yMax: 200 });
});
