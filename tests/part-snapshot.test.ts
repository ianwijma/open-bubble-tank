import { expect, test } from 'bun:test';
import { partSnapshot } from '../src/game/assets/part-snapshot';
import { buildDisplayList } from '../src/game/assets/display-list';
import { AssetPack, type SpriteInfo } from '../src/game/assets/asset-pack';
import { STARTER } from '../src/game/data/catalog';
import type { ClipSource } from '../src/game/assets/swf-clip';

const matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const sprites: Record<number, SpriteInfo> = {
  721: {
    id: 721,
    frameCount: 1,
    placements: [
      { depth: 1, charId: 720, matrix, frame: 1, name: 'bullet_mc' },
      { depth: 2, charId: 22, matrix, frame: 1, ratio: 177, clipDepth: 3 },
    ],
  },
  720: { id: 720, frameCount: 27, placements: [{ depth: 1, charId: 718, matrix, frame: 2 }] },
  22: { id: 22, frameCount: 40, placements: [{ depth: 1, charId: 21, matrix, frame: 1 }] },
  680: { id: 680, frameCount: 40, placements: [] },
  20: { id: 20, frameCount: 100, placements: [] },
};
const source: ClipSource = {
  spriteInfo: (id) => sprites[id],
  displayList: (id, frame) => (sprites[id] ? buildDisplayList(sprites[id], frame) : []),
};

test('fresh posters honor independent stopped descendants and retain placement metadata', () => {
  const pose = partSnapshot({ id: 3008, symbol: 721 }, source);
  expect(pose.frame).toBe(1);
  expect(pose.children.get(1)!.clip.frame).toBe(1);
  expect(pose.children.get(1)!.clip.placements).toEqual([]);
  expect(source.displayList(720, 2)).toHaveLength(1);
  expect(pose.children.get(2)!.placement).toMatchObject({ ratio: 177, clipDepth: 3 });
  const other = partSnapshot({ id: 3008, symbol: 721 }, source);
  expect(other.children.get(2)!.clip.frame).toBe(pose.children.get(2)!.clip.frame);
  expect(other).not.toBe(pose);
});

test('body class snapshots select root frame2 before its random first-frame action', () => {
  const pose = partSnapshot({ id: 1001, symbol: 680 }, source, 'class');
  expect(pose.frame).toBe(2);
  pose.advance(20);
  expect(pose.frame).toBe(2);
  expect(() => partSnapshot({ id: 2001, symbol: 680 }, source, 'class')).toThrow('body');
});

test('poster Y branches stay separate from the stopped class measurement pose', () => {
  expect(partSnapshot({ id: 1501, symbol: 20 }, source, 'poster', 0).frame).toBe(1);
  expect(partSnapshot({ id: 1501, symbol: 20 }, source, 'poster', 1).frame).toBe(51);
  expect(partSnapshot({ id: 1501, symbol: 20 }, source, 'class', 1).frame).toBe(2);
});

test('class bounds transform separate leaves before union for rotated fractional placements', () => {
  const clipSource: ClipSource = {
    spriteInfo: (id) => (id === 20 ? { frameCount: 100 } : undefined),
    displayList: (id) =>
      id === 20
        ? [0, 1].map((index) => ({
            charId: 90001,
            depth: index + 1,
            frame: 1,
            bornFrame: 1,
            matrix: { ...matrix, tx: index * 400, ty: index * 400 },
          }))
        : [],
  };
  const pose = partSnapshot({ id: 1501, symbol: 20 }, clipSource, 'class');
  const pack = new AssetPack('swf');
  Object.assign(pack, {
    classPoses: new Map([[1501, pose]]),
    shapes: new Map([[90001, { id: 90001, bounds: { xMin: 0, xMax: 200, yMin: 0, yMax: 40 } }]]),
  });
  const bounds = pack.classBodyBounds({
    ...STARTER.parts[0],
    type: 1501,
    x: 0.25,
    y: -0.75,
    rotation: 45,
    scale: 1,
  })!;
  expect(bounds.x).toBeCloseTo(0.25 - 2 / Math.sqrt(2), 8);
  expect(bounds.y).toBeCloseTo(-0.75, 8);
  expect(bounds.width).toBeCloseTo(12 / Math.sqrt(2), 8);
  expect(bounds.height).toBeCloseTo(52 / Math.sqrt(2), 8);
});
