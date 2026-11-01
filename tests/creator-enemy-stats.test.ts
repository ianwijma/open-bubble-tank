import { expect, test } from 'bun:test';
import {
  creatorSuggestedStats,
  creatorImportedSuggested,
} from '../src/game/core/creator-enemy-stats';
import { suggestedStats } from '../src/game/simulation/designer';
import type { TankPart } from '../src/game/core/types';

const part = (type: number, index = 0): TankPart => ({
  key: String(index),
  type,
  x: 0,
  y: 0,
  radius: 7,
  rotation: 0,
  scale: 1,
  twin: '',
});
test('suggested life keeps the distinct panel, save and import rounding order', () => {
  const build = { parts: [part(1001)], classId: 3 }; // BP1, GP0: base0.5.
  expect(creatorSuggestedStats(build, 'panel')).toEqual({ life: 2, reward: 1, speed: 2 });
  expect(creatorSuggestedStats(build, 'save')).toEqual({ life: 3, reward: 1, speed: 2 });
  expect(creatorSuggestedStats(build, 'load')).toEqual({ life: 1.5, reward: 1, speed: 2 });
});
test('the existing designer adapter retains source zero life for an empty suggestion', () => {
  expect(suggestedStats({ parts: [], classId: 1 })).toEqual({ life: 0, reward: 1, speed: 3 });
});
test('suggestions retain the reward discount cap, minimum speed and unrestricted life', () => {
  expect(
    creatorSuggestedStats({
      parts: Array.from({ length: 10 }, (_, i) => part(4001, i)),
      classId: 6,
    }),
  ).toEqual({ life: 240, reward: 24, speed: 0.1 });
  // Manual slider limits must not clamp this independent source counter calculation.
  expect(
    creatorSuggestedStats({
      parts: Array.from({ length: 400 }, (_, i) => part(1001, i)),
      classId: 6,
    }),
  ).toEqual({ life: 1200, reward: 60, speed: 0.5 });
});
test('suggested speed floors binary Number arithmetic to hundredths', () => {
  expect(
    creatorSuggestedStats({
      parts: Array.from({ length: 3 }, (_, i) => part(4001, i)),
      classId: 6,
    }).speed,
  ).toBe(0.19);
});
test('import comparison uses preceding counters and preserves a manual-mode latch', () => {
  const empty = { parts: [], classId: 1 },
    tank = { life: 0, reward: 1, speed: 3 };
  expect(creatorImportedSuggested(tank, empty)).toBe(true);
  expect(creatorImportedSuggested(tank, empty, false)).toBe(false);
  expect(creatorImportedSuggested({ ...tank, life: 20 }, empty)).toBe(false);
  expect(creatorImportedSuggested(tank, { parts: [part(1001)], classId: 1 })).toBe(false);
});
