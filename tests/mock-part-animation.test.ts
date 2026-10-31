import { expect, test } from 'bun:test';
import data from '../src/game/data/mock-part-timelines.json';
import { SwfClip, type ClipSource } from '../src/game/assets/swf-clip';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SpriteInfo } from '../src/game/assets/asset-pack';
import { PARTS } from '../src/game/data/catalog';
const sprites = new Map(data.sprites.map((s) => [s.id, s as SpriteInfo]));
const source: ClipSource = {
  spriteInfo: (id) => sprites.get(id),
  displayList: (id, frame) => (sprites.has(id) ? buildDisplayList(sprites.get(id)!, frame) : []),
};
function pose(id: number, age: number) {
  const clip = new SwfClip(id, source, () => 0);
  clip.advance(age);
  return clip;
}
test('mock Skittish translates its satellite and Phasing traverses square edges', () => {
  expect(pose(43, 1).children.get(3)!.placement.matrix.ty / 20).toBe(-11.9);
  expect(pose(43, 10).children.get(3)!.placement.matrix.ty / 20).toBe(3.1);
  expect(pose(43, 21).children.get(3)!.placement.matrix.ty / 20).toBe(-11.9);
  const a = pose(2222, 1).children.get(3)!.placement.matrix;
  const b = pose(2222, 15).children.get(3)!.placement.matrix;
  expect([a.tx / 20, a.ty / 20]).toEqual([-11.9, -11.9]);
  expect([b.tx / 20, b.ty / 20]).toEqual([3.1, -11.9]);
  expect(pose(2222, 30).frame).toBe(1);
});
test('mock bubble breathing changes the full silhouette and preserves stopped parents', () => {
  expect(pose(22, 1).children.get(1)!.placement.matrix.a).toBe(1);
  expect(pose(22, 25).children.get(1)!.placement.matrix.a).toBe(0.653839111328125);
  expect(pose(22, 40).children.get(1)!.placement.matrix.a).toBe(1);
  const rotating = pose(701, 25);
  expect(rotating.frame).toBe(1);
  expect(rotating.children.get(1)!.clip.frame).toBe(25);
  expect(rotating.children.get(1)!.clip.children.get(1)!.placement.matrix.a).toBe(
    0.653839111328125,
  );
});
test('Sapper retains its late pale-pellet transform and Carrier loops before its burst tail', () => {
  const pellet = pose(693, 10).children.get(25)!;
  expect(pellet.placement.color).toEqual({
    mult: [79 / 256, 79 / 256, 79 / 256, 1],
    add: [176, 176, 176, 0],
  });
  expect(pose(693, 20).children.get(25)!.placement.matrix.ty / 20).toBe(-16.5);
  for (const age of [40, 79, 118, 157]) expect(pose(695, age).frame).toBe(1);
});

test('all body roots retain their source timelines, including three static base variants', () => {
  expect(PARTS.filter((p) => p.id < 2000)).toHaveLength(20);
  for (const part of PARTS) expect(sprites.has(part.symbol), String(part.id)).toBe(true);
  for (const id of [1782, 2185, 29]) expect(sprites.get(id)!.frameCount).toBe(1);
  expect(pose(680, 25).children.get(2)!.placement.matrix.a).toBe(0.653839111328125);
  expect(pose(680, 40).children.get(2)!.placement.matrix.a).toBe(1);
});

test('body clusters retain authored travel, angles, independent children and long loops', () => {
  expect(pose(2448, 1).children.get(1)!.placement.matrix.tx).toBe(1);
  expect(pose(2448, 25).children.get(1)!.placement.matrix.tx).toBe(456);
  expect(pose(2446, 25).children.get(3)!.placement.matrix.b).toBe(0.178009033203125);
  const bladder = pose(2445, 341);
  expect(bladder.frame).toBe(1);
  expect(bladder.children.get(1)!.clip.age).toBeGreaterThan(300);
  expect(pose(2447, 1).placements).toHaveLength(0); // The source allows a rounded random start of0→1.
  expect(pose(2447, 25).placements).toHaveLength(7);
});
