import { expect, test } from 'bun:test';
import { WIN_SCREEN, WinScreenState } from '../src/game/core/win-screen';

test('win preparation takes forty source frames and nineteen blur passes before the native fade', () => {
  const state = new WinScreenState();
  expect([state.contentFrame, state.alpha, state.blurPasses]).toEqual([1, 0, 0]);
  for (let i = 0; i < 39; i++) state.advance();
  expect([state.contentFrame, state.alpha, state.blurPasses]).toEqual([1, 0, 19]);
  state.advance();
  expect([state.contentFrame, state.alpha]).toEqual([2, 0]);
  state.advance();
  expect([state.contentFrame, state.alpha]).toEqual([3, 22 / 256]);
  for (let i = 0; i < 21; i++) state.advance();
  expect([state.contentFrame, state.alpha, state.complete]).toEqual([24, 1, false]);
  state.advance();
  expect([state.age, state.contentFrame, state.complete]).toEqual([63, 25, true]);
  state.advance();
  expect(state.age).toBe(63);
});

test('win retains the authored active controls and static title while omitting retired promotion', () => {
  expect(WIN_SCREEN.pieces.filter((p) => p.name).map((p) => [p.symbol, p.x, p.y])).toEqual([
    [2260, 275, 191.2],
    [2263, 275.05, 393.75],
  ]);
  expect(WIN_SCREEN.pieces.find((p) => p.symbol === 2273)?.text).toBe(
    "You've Proven Yourself The Greatest!",
  );
  for (const id of WIN_SCREEN.omittedSymbols)
    expect(WIN_SCREEN.pieces.some((p) => p.symbol === id)).toBe(false);
});
