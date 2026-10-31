import { expect, test } from 'bun:test';
import {
  NEW_ENEMY_STATS,
  creatorSuggestedStats,
  creatorImportedSuggested,
  enemyStatHandle,
  enemyStatFromHandle,
  enemyStatText,
  advanceSuggestedConfirm,
  HIDDEN_SUGGESTED_CONFIRM,
} from '../src/game/core/creator-enemy-stats';
import { STARTER } from '../src/game/data/catalog';
import type { TankPart } from '../src/game/core/types';
const body: TankPart = {
  key: 'body',
  type: 1001,
  x: 0,
  y: 0,
  radius: 7,
  rotation: 0,
  scale: 1,
  twin: '',
};
test('new enemy defaults survive geometry edits until suggested panel/save calculation', () => {
  expect(NEW_ENEMY_STATS).toEqual({ life: 20, reward: 20, speed: 2 });
  const d = { parts: [body], classId: 3 };
  expect(creatorSuggestedStats(d, 'panel').life).toBe(2);
  expect(creatorSuggestedStats(d, 'save').life).toBe(3);
  expect(creatorSuggestedStats(d, 'load').life).toBe(1.5);
  expect(creatorSuggestedStats({ parts: [], classId: 1 })).toEqual({
    life: 0,
    reward: 1,
    speed: 3,
  });
  expect(creatorSuggestedStats({ ...STARTER, classId: 6 })).toMatchObject({ speed: 0.4 });
});
test('import suggested detection retains the old counters and cannot re-enable an unchecked box', () => {
  const previous = { parts: [], classId: 1 },
    tank = { life: 0, reward: 1, speed: 3 };
  expect(creatorImportedSuggested(tank, previous)).toBe(true);
  expect(creatorImportedSuggested(tank, previous, false)).toBe(false);
  expect(creatorImportedSuggested({ ...tank, life: 20 }, previous)).toBe(false);
  expect(creatorImportedSuggested(tank, { parts: [body], classId: 1 })).toBe(false);
});
test('enemy stat sliders use quadratic ranges and asymmetric speed quantization', () => {
  expect(enemyStatFromHandle('life', -100)).toBe(1);
  expect(enemyStatFromHandle('life', 0)).toBe(250);
  expect(enemyStatFromHandle('life', 100)).toBe(1000);
  expect(enemyStatFromHandle('reward', 0)).toBe(125);
  expect(enemyStatFromHandle('speed', 0)).toBe(1);
  expect(enemyStatFromHandle('speed', 1)).toBe(1);
  expect(enemyStatFromHandle('speed', 55)).toBe(4);
  expect(enemyStatHandle('life', 1)).toBe(-55);
  expect(enemyStatHandle('life', 1000)).toBe(55);
  expect(enemyStatHandle('life', 0)).toBe(0);
  expect(enemyStatHandle('speed', 1)).toBe(0);
  expect(enemyStatHandle('life', 20)).toBeCloseTo(-39.8, 1);
});
test('manual stat input clamps Number values while retaining a trailing speed decimal', () => {
  expect(enemyStatText('life', 'bogus')).toBe(1);
  expect(enemyStatText('reward', '')).toBe(1);
  expect(enemyStatText('life', '3.75')).toBe(3.75);
  expect(enemyStatText('life', '9999')).toBe(1000);
  expect(enemyStatText('reward', '-5')).toBe(1);
  expect(enemyStatText('speed', '2.')).toBeUndefined();
  expect(enemyStatText('speed', '2.75')).toBe(2.75);
  expect(enemyStatText('speed', 'oops')).toBe(0);
});
test('suggestion confirmation stops at authored frames and play resumes its existing position', () => {
  const opening = advanceSuggestedConfirm({ frame: 2, playing: true, interactive: true }, 100);
  expect(opening).toEqual({ frame: 12, playing: false, interactive: true });
  expect(advanceSuggestedConfirm({ ...opening, playing: true, interactive: false }, 11)).toEqual(
    HIDDEN_SUGGESTED_CONFIRM,
  );
  // A too-early response keeps the source frame12 stop rather than inventing a jump.
  expect(advanceSuggestedConfirm({ frame: 9, playing: true, interactive: false }, 20)).toEqual({
    frame: 12,
    playing: false,
    interactive: false,
  });
});
