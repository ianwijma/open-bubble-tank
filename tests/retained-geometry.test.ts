import { expect, test } from 'bun:test';
import { AssetPack, type DisplayPlacement } from '../src/game/assets/asset-pack';
import {
  retainedClipGeometry,
  type RetainedGeometrySource,
} from '../src/game/assets/retained-geometry';
import { SwfClip } from '../src/game/assets/swf-clip';
import { displayGeometryBounds, displayGeometryHit } from '../src/game/core/display-geometry';
import { DISPLAY_IDENTITY } from '../src/game/core/display-transform';

const placement = (charId: number, depth: number, tx = 0): DisplayPlacement => ({
  charId,
  depth,
  frame: 1,
  bornFrame: 1,
  matrix: { ...DISPLAY_IDENTITY, tx },
});
const source: RetainedGeometrySource = {
  isSprite: (id) => id < 10,
  leaf: (id, ratio) =>
    id >= 10 && id < 20
      ? {
          kind: 'leaf',
          bounds: { xMin: 0, yMin: 0, xMax: 200, yMax: 200 },
          hit: ({ x, y }) => x === ratio && y === 0,
        }
      : undefined,
};
function tree() {
  let draws = 0;
  const poses = new Map([[1, [placement(10, 1), placement(11, 2, 400)]]]),
    clips = {
      spriteInfo: (id: number) => (id < 10 ? { frameCount: 1 } : undefined),
      displayList: (id: number) => poses.get(id) ?? [],
    },
    clip = new SwfClip(1, clips, () => {
      draws++;
      return 0.5;
    });
  clip.construct();
  return { clip, draws: () => draws };
}

test('retained geometry follows current placements despite child Map history and makes no playback/random writes', () => {
  const { clip, draws } = tree(),
    first = clip.children.get(1)!;
  clip.children.delete(1);
  clip.children.set(1, first);
  const before = { age: clip.age, frame: clip.frame, draws: draws(), children: [...clip.children] },
    result = retainedClipGeometry(clip, source);
  expect(result.content.kind).toBe('container');
  if (result.content.kind !== 'container') throw new Error('Expected container');
  expect(result.content.children.map((c) => c.depth)).toEqual([1, 2]);
  expect(displayGeometryBounds(result)).toEqual({ xMin: 0, yMin: 0, xMax: 600, yMax: 200 });
  expect({
    age: clip.age,
    frame: clip.frame,
    draws: draws(),
    children: [...clip.children],
  }).toEqual(before);
  expect(result.content.children[0].matrix).not.toBe(first.placement.matrix);
});

test('retained reads reject missing/mismatched children and unknown leaves rather than rebuilding from age', () => {
  const { clip } = tree();
  clip.children.delete(1);
  expect(() => retainedClipGeometry(clip, source)).toThrow('Unresolved retained child 1/1');
  const other = tree().clip;
  other.placements[0] = { ...other.placements[0], charId: 12 };
  expect(() => retainedClipGeometry(other, source)).toThrow('Unresolved retained child 1/1');
  const unknown = new SwfClip(99, { spriteInfo: () => undefined, displayList: () => [] });
  expect(() => retainedClipGeometry(unknown, source)).toThrow(
    'Unsupported retained geometry symbol 99',
  );
});

test('placement morph ratio is read from the retained parent and empty sprites remain explicit', () => {
  const { clip } = tree();
  clip.placements[0] = { ...clip.placements[0], ratio: 5 };
  expect(displayGeometryHit(retainedClipGeometry(clip, source), { x: 5, y: 0 })).toBe(true);
  expect(displayGeometryHit(retainedClipGeometry(clip, source), { x: 0, y: 0 })).toBe(false);
  const empty = new SwfClip(2, { spriteInfo: () => ({ frameCount: 1 }), displayList: () => [] });
  empty.construct();
  expect(displayGeometryBounds(retainedClipGeometry(empty, source))).toBeUndefined();
});

test('native adapter preserves declared morph Script bounds and rejects mock/raster/unknown geometry', () => {
  const pack = new AssetPack('swf'),
    bounds = { xMin: -1010, yMin: -1010, xMax: 1010, yMax: 1010 };
  Object.assign(pack, {
    shapes: new Map([[10, { id: 10, bounds, runs: [] }]]),
    morphs: new Map([[11, { id: 11, startBounds: bounds, endBounds: { ...bounds, xMax: 9000 } }]]),
  });
  const shape = new SwfClip(10, pack),
    morph = new SwfClip(11, pack);
  expect(displayGeometryBounds(pack.nativeClipGeometry(shape))).toEqual(bounds);
  expect(displayGeometryBounds(pack.nativeClipGeometry(morph))).toEqual(bounds);
  // Outside the actual leaf rectangle requires no DOM/Path allocation or raster.
  expect(displayGeometryHit(pack.nativeClipGeometry(shape), { x: 1000, y: 0 })).toBe(false);
  expect(pack.shapeContactCount).toBe(0);
  expect(() => new AssetPack('mock').nativeClipGeometry(shape)).toThrow('Native geometry requires');
  const unsupported = new SwfClip(12, pack);
  Object.assign(pack, { leaves: new Map([[12, { pixels: [255], width: 1, height: 1 }]]) });
  expect(() => pack.nativeClipGeometry(unsupported)).toThrow(
    'Unsupported retained geometry symbol 12',
  );
});
