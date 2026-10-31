import { expect, test } from 'bun:test';
import { parseButtonTag } from '../src/game/assets/swf-symbols.mjs';
import { buttonDisplayList, type ButtonInfo } from '../src/game/assets/button-display-list';

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
  const placement = buttonDisplayList(result, 'up')[0];
  expect(placement).toMatchObject({
    frame: 1,
    bornFrame: 1,
    matrix: { tx: 40, ty: -60 },
    color: { mult: [1, 1, 1, 0.5], add: [0, 0, 0, 0] },
  });
  expect(placement).not.toHaveProperty('states');
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

test('DefineButton2 retains glow and blend metadata while consuming unsupported filters before the next record', () => {
  const result = parseButtonTag(
    Uint8Array.from([
      17,
      0,
      0,
      0,
      0, // header: button17, trackAsMenu false, no actions
      0x31,
      1,
      0,
      2,
      0,
      0,
      0, // up record, identity matrix/color, filter+blend flags
      2, // filter count
      1,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      0, // unsupported blur filter
      2,
      10,
      20,
      30,
      40,
      0,
      0,
      1,
      0,
      0,
      0,
      2,
      0,
      128,
      1,
      0xa3, // glow
      8, // blend mode
      8,
      2,
      0,
      7,
      0,
      14,
      162,
      32,
      0, // hit-only record, translated matrix/color
      0, // record terminator
    ]),
    34,
  );
  expect(result.states).toHaveLength(2);
  expect(result.states[0]).toMatchObject({
    filters: [
      {
        kind: 'glow',
        color: [10, 20, 30, 40],
        blurX: 1,
        blurY: 2,
        strength: 1.5,
        inner: true,
        knockout: false,
        compositeSource: true,
        passes: 3,
      },
    ],
    blendMode: 8,
  });
  expect(result.states[1]).toMatchObject({
    charId: 2,
    depth: 7,
    matrix: { tx: 40, ty: -60 },
    states: { up: false, over: false, down: false, hit: true },
  });
});
