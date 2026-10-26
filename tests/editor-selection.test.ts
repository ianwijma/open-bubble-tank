import { expect, test } from 'bun:test';
import type { TankPart } from '../src/game/core/types';
import {
  addSelection,
  emptySelection,
  marqueeSelection,
  orderSelection,
  removeParts,
  toggleSelection,
  transformSelection,
  unlinkPartialSelection,
} from '../src/game/simulation/editor-selection';
import { beginSelectionDrag, advanceSelectionDrag } from '../src/game/simulation/editor-drag';
const part = (key: string, x: number, y: number, twin = ''): TankPart => ({
  key,
  type: 1001,
  x,
  y,
  twin,
  radius: 10,
  scale: 1,
  rotation: 0,
});
const parts = [part('a', 0, -30, 'b'), part('b', 0, 30, 'a'), part('c', 50, -10), part('d', 90, 0)];

test('creator clicks add without modifiers and remove one selected twin at a time', () => {
  let s = toggleSelection(parts, emptySelection(), 'a', true);
  expect(s).toEqual({ keys: ['a', 'b'], ghosts: ['b'] });
  s = toggleSelection(parts, s, 'c', true);
  expect(s.keys).toEqual(['a', 'b', 'c']);
  s = toggleSelection(parts, s, 'a', true);
  expect(s).toEqual({ keys: ['b', 'c'], ghosts: [] });
  const unlinked = unlinkPartialSelection(parts, s);
  expect(unlinked.slice(0, 2).map((p) => p.twin)).toEqual(['', '']);
  expect(toggleSelection(parts, s, undefined, true)).toEqual(emptySelection());
});
test('creator marquee adds touched radius samples in either drag direction and clears an empty box', () => {
  const before = addSelection(parts, emptySelection(), 'd', false);
  const s = marqueeSelection(parts, before, { x: 41, y: -11 }, { x: 39, y: -9 }, true, () => false);
  expect(s.keys).toEqual(['d', 'c']); // c's left radius, not its center
  const paired = marqueeSelection(parts, s, { x: -1, y: -31 }, { x: 1, y: -29 }, true, () => false);
  expect(paired).toEqual({ keys: ['d', 'c', 'a', 'b'], ghosts: ['b'] });
  expect(
    marqueeSelection(parts, paired, { x: 100, y: 100 }, { x: 110, y: 110 }, true, () => false),
  ).toEqual(emptySelection());
});
test('creator group drag mirrors by initial pointer side, retaining each part offset', () => {
  const selection = { keys: ['a', 'b', 'c'], ghosts: ['b'] };
  const moved = advanceSelectionDrag(beginSelectionDrag(parts, selection, { x: 2, y: -25 }, true), {
    x: 12,
    y: -40,
  }).parts;
  expect(moved.map((p) => [p.x, p.y])).toEqual([
    [10, -45],
    [10, 45],
    [60, -25],
    [90, 0],
  ]);
  const ordinary = advanceSelectionDrag(
    beginSelectionDrag(parts, selection, { x: 2, y: -25 }, false),
    { x: 12, y: -40 },
  ).parts;
  expect(ordinary.map((p) => [p.x, p.y])).toEqual([
    [10, -45],
    [10, 15],
    [60, -25],
    [90, 0],
  ]);
  expect(ordinary.slice(0, 2).map((p) => p.twin)).toEqual(['', '']);
  expect(parts[0].y).toBe(-30);
});
test('creator controls set all selected scales and mirror absolute rotation by Y', () => {
  const selected = { keys: ['a', 'b', 'c'], ghosts: ['b'] };
  const changed = transformSelection(parts, selected, { rotation: 70, scale: 1.5 });
  expect(changed.map((p) => [p.rotation, p.scale])).toEqual([
    [70, 1.5],
    [-70, 1.5],
    [70, 1.5],
    [0, 1],
  ]);
  expect(changed.map((p) => [p.x, p.y])).toEqual(parts.map((p) => [p.x, p.y]));
});
test('creator deletes only selected parts and keeps the relative layering of a group', () => {
  expect(removeParts(parts, ['a']).map((p) => [p.key, p.twin])).toEqual([
    ['b', ''],
    ['c', ''],
    ['d', ''],
  ]);
  const selection = { keys: ['a', 'c'], ghosts: [] };
  expect(orderSelection(parts, selection, true).map((p) => p.key)).toEqual(['b', 'd', 'a', 'c']);
  expect(orderSelection(parts, selection, false).map((p) => p.key)).toEqual(['a', 'c', 'b', 'd']);
});
