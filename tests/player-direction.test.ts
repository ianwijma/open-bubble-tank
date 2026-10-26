import { expect, test } from 'bun:test';
import { movementTurn } from '../src/game/simulation/player-direction';

test('movement direction retains source opposite-side ties and clamps small differences', () => {
  expect(movementTurn(0, { x: -6, y: 0 })).toBe(1.5);
  expect(movementTurn(90, { x: 0, y: -6 })).toBe(1.5);
  expect(movementTurn(-90, { x: 0, y: 6 })).toBe(-1.5);
  expect(movementTurn(0, { x: 0, y: 0 })).toBe(0);
  expect(movementTurn(89.9, { x: 0, y: 6 })).toBeCloseTo(0.1);
  expect(movementTurn(-89.9, { x: 0, y: -6 })).toBeCloseTo(-0.1);
});
