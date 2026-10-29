import { expect, test } from 'bun:test';
import { parseButtonTag } from '../src/game/assets/swf-symbols.mjs';
import { buttonDisplayList, type ButtonInfo } from '../src/game/assets/button-display-list';
import { creatorControl } from '../src/game/core/creator-controls';

test('creator text matrices do not enlarge the source Undo hit rectangle twice', () => {
  expect(creatorControl('Undo_mc').bounds).toEqual({ x: -0.5, y: -0.5, width: 58, height: 23 });
});

test('DefineButton1 retains aligned matrices without inventing a color transform', () => {
  const result = parseButtonTag(Uint8Array.from([7, 0, 15, 1, 0, 2, 0, 14, 162, 32, 0]), 7);
  expect(result.states[0]).toEqual({
    states: { up: true, over: true, down: true, hit: true },
    charId: 1,
    depth: 2,
    matrix: { a: 1, b: 0, c: 0, d: 1, tx: 40, ty: -60 },
  });
});
test('DefineButton2 preserves alpha, trackAsMenu and state-specific transform data', () => {
  const bits = (
    '01' +
    '1010' +
    ['0100000000', '0100000000', '0100000000', '0010000000'].join('')
  ).padEnd(48, '0');
  const cx = Array.from({ length: 6 }, (_, i) => parseInt(bits.slice(i * 8, i * 8 + 8), 2));
  const result = parseButtonTag(
    Uint8Array.from([17, 0, 1, 0, 0, 15, 230, 2, 5, 0, 14, 162, 32, ...cx, 0]),
    34,
  );
  expect(result).toMatchObject({ id: 17, trackAsMenu: true, hasActions: false });
  expect(result.states[0]).toMatchObject({
    charId: 742,
    matrix: { tx: 40, ty: -60 },
    color: { mult: [1, 1, 1, 0.5], add: [0, 0, 0, 0] },
  });
});
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
