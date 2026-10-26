import { expect, test } from 'bun:test';
import type { TankPart } from '../src/game/core/types';
import { advanceSelectionDrag, beginSelectionDrag } from '../src/game/simulation/editor-drag';
const part = (key: string, y: number, twin = ''): TankPart => ({
  key,
  type: 1001,
  x: 10,
  y,
  twin,
  rotation: 70,
  scale: 1.5,
  radius: 7,
});
const pair = [part('a', -10, 'b'), part('b', 10, 'a')];
const selection = { keys: ['a', 'b'], ghosts: ['b'] };

test('axis drag merges the faded twin on the next source mouse-move and respawns it above its owner', () => {
  let drag = beginSelectionDrag(pair, selection, { x: 10, y: -7 }, true);
  drag = advanceSelectionDrag(drag, { x: 10, y: 3 });
  expect(drag.parts.map((p) => p.y)).toEqual([0, 0]);
  expect(drag.parts).toHaveLength(2); // snap examines positions before moving
  drag = advanceSelectionDrag(drag, { x: 11, y: 3 });
  expect(drag.locked).toBe(true);
  expect(drag.parts).toEqual([{ ...pair[0], x: 11, y: 0, twin: '' }]);
  expect(drag.selection).toEqual({ keys: ['a'], ghosts: [] });
  drag = advanceSelectionDrag(drag, { x: 12, y: 8 });
  expect(drag.locked).toBe(false);
  expect(drag.parts.map((p) => [p.key, p.x, p.y, p.rotation, p.scale, p.twin])).toEqual([
    ['a', 12, 5, 70, 1.5, 'a-twin-1'],
    ['a-twin-1', 12, -5, -70, 1.5, 'a'],
  ]);
  expect(drag.selection).toEqual({ keys: ['a', 'a-twin-1'], ghosts: ['a-twin-1'] });
  expect(pair.map((p) => p.y)).toEqual([-10, 10]);
});
test('axis drag preserves the opaque twin when the pointer follows the faded twin', () => {
  let drag = beginSelectionDrag(pair, selection, { x: 10, y: 7 }, true);
  expect(drag.reference).toBe('b');
  drag = advanceSelectionDrag(drag, { x: 10, y: -3 });
  drag = advanceSelectionDrag(drag, { x: 11, y: -3 });
  expect(drag.parts.map((p) => p.key)).toEqual(['a']);
  drag = advanceSelectionDrag(drag, { x: 11, y: -8 });
  expect(drag.parts.map((p) => p.y)).toEqual([5, -5]);
  expect(drag.selection.ghosts).toEqual(['a-twin-1']);
});
test('a center part keeps the first-move grab offset and spawns one reciprocal mirrored twin', () => {
  const parts = [part('p', 0), part('other', 50)];
  let drag = beginSelectionDrag(parts, { keys: ['p'], ghosts: [] }, { x: 10, y: 2 }, true, false, {
    x: 10,
    y: 3,
  });
  drag = advanceSelectionDrag(drag, { x: 10, y: 3 });
  expect(drag.parts).toHaveLength(2);
  drag = advanceSelectionDrag(drag, { x: 10, y: 5 });
  expect(drag.parts.map((p) => [p.key, p.y])).toEqual([
    ['p', 2],
    ['p-twin-1', -2],
    ['other', 50],
  ]);
  drag = advanceSelectionDrag(drag, { x: 11, y: 6 });
  expect(drag.parts.map((p) => p.y)).toEqual([3, -3, 50]);
  expect(drag.parts.filter((p) => p.twin === 'p')).toHaveLength(1);
});
test('axis merging requires both twins selected and asymmetric dragging never duplicates', () => {
  let drag = beginSelectionDrag(
    pair.map((p) => ({ ...p, y: 0 })),
    { keys: ['a'], ghosts: [] },
    { x: 10, y: 0 },
    true,
  );
  drag = advanceSelectionDrag(drag, { x: 11, y: 0 });
  expect(drag.parts).toHaveLength(2);
  drag = beginSelectionDrag(pair, { keys: ['a'], ghosts: [] }, { x: 10, y: -10 }, false);
  drag = advanceSelectionDrag(drag, { x: 10, y: 0 });
  expect(drag.parts.map((p) => [p.y, p.twin])).toEqual([
    [0, ''],
    [10, ''],
  ]);
});
test('the bytecode half-pixel candidate threshold and positive entry delta are retained', () => {
  let drag = beginSelectionDrag(
    [part('p', 0.4)],
    { keys: ['p'], ghosts: [] },
    { x: 10, y: 0.4 },
    true,
  );
  drag = advanceSelectionDrag(drag, { x: 11, y: 0.45 });
  expect(drag.parts[0].y).toBeCloseTo(0.8);
  expect(drag.locked).toBe(true);
  drag = beginSelectionDrag([part('p', 0.6)], { keys: ['p'], ghosts: [] }, { x: 10, y: 0.6 }, true);
  drag = advanceSelectionDrag(drag, { x: 11, y: 0.7 });
  expect(drag.parts[0].y).toBeCloseTo(0.7);
  expect(drag.locked).toBe(false);
});
