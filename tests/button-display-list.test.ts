import { expect, test } from 'bun:test';
import { buttonDisplayList, type ButtonInfo } from '../src/game/assets/button-display-list';

test('button display states sort by depth and exclude hit-only geometry from painting', () => {
  const m = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const b: ButtonInfo = {
    id: 1,
    states: [
      { charId: 3, depth: 7, matrix: m, states: { up: true, over: true, down: false, hit: false } },
      {
        charId: 4,
        depth: 1,
        matrix: m,
        states: { up: false, over: false, down: false, hit: true },
      },
      { charId: 2, depth: 2, matrix: m, states: { up: true, over: false, down: true, hit: false } },
    ],
  };
  expect(buttonDisplayList(b, 'up').map((p) => p.charId)).toEqual([2, 3]);
  expect(buttonDisplayList(b, 'over').map((p) => p.charId)).toEqual([3]);
  expect(buttonDisplayList(b, 'down').map((p) => p.charId)).toEqual([2]);
  expect(buttonDisplayList(b, 'hit').map((p) => p.charId)).toEqual([4]);
});
