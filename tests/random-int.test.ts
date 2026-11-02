import { expect, test } from 'bun:test';
import { Random } from '../src/game/core/math';

test('source integer rolls retain descending safety-turn bounds and draw order', () => {
  const random = new Random(1),
    draws = [0, 0.25, 0.5, 0.75, 1 - 2 ** -32];
  let index = 0;
  random.next = () => draws[index++];
  expect(draws.map(() => random.int(-120, -180))).toEqual([-120, -135, -150, -165, -180]);
  expect(index).toBe(draws.length);
});

test('source inclusive rounding retains ascending and equal-bound outcomes', () => {
  const random = new Random(1);
  for (const [draw, expected] of [
    [0, 1],
    [0.25, 2],
    [0.5, 3],
    [0.75, 4],
    [1 - 2 ** -32, 5],
  ]) {
    random.next = () => draw;
    expect(random.int(1, 5)).toBe(expected);
    expect(random.int(-7, -7)).toBe(-7);
  }
  random.next = () => 0.5;
  expect(random.int(1, 2)).toBe(2);
});
