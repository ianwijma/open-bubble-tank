import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import {
  sameViewerTank,
  appendViewerTank,
  removeViewerTank,
} from '../src/game/core/viewer-storage';

test('source save identity ignores ID, code provenance, class and tank statistics', () => {
  expect(
    sameViewerTank(STARTER, {
      ...STARTER,
      id: 'L-other',
      sourceCode: undefined,
      avatar: !STARTER.avatar,
      classId: 6,
      life: 900,
      speed: 3,
      reward: 200,
      difficulty: 10,
      parts: STARTER.parts.map((p) => ({ ...p })),
    }),
  ).toBe(true);
});
test('source save identity checks exact author/name and every ordered part field', () => {
  for (const patch of [
    { author: 'other' },
    { name: STARTER.name.toUpperCase() },
    { parts: STARTER.parts.slice(1) },
    { parts: [...STARTER.parts].reverse() },
  ])
    expect(sameViewerTank(STARTER, { ...STARTER, ...patch })).toBe(false);
  for (const field of ['key', 'type', 'twin', 'x', 'y', 'rotation', 'scale', 'radius'] as const) {
    const value = STARTER.parts[0][field],
      part = { ...STARTER.parts[0], [field]: typeof value === 'string' ? `${value}x` : value + 1 };
    expect(sameViewerTank(STARTER, { ...STARTER, parts: [part, ...STARTER.parts.slice(1)] })).toBe(
      false,
    );
  }
});
test('viewer save suppresses matching geometry under a different ID but retains distinct designs sharing an ID', () => {
  const tanks = [STARTER],
    alias = { ...STARTER, id: 'L-other' },
    renamed = { ...STARTER, name: 'Distinct' };
  expect(appendViewerTank(tanks, alias)).toBe(tanks);
  expect(appendViewerTank(tanks, renamed)).toEqual([STARTER, renamed]);
  expect(appendViewerTank(tanks, { ...alias, avatar: !alias.avatar })).toHaveLength(2);
});
test('viewer deletion removes the first source match without deleting other designs sharing its ID', () => {
  const renamed = { ...STARTER, name: 'Distinct' },
    alias = { ...STARTER, id: 'L-other' },
    tanks = [STARTER, renamed, alias];
  expect(removeViewerTank(tanks, alias)).toEqual([renamed, alias]);
  expect(removeViewerTank(tanks, { ...STARTER, author: 'missing' })).toBe(tanks);
});
