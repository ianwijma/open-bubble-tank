import { expect, test } from 'bun:test';
import { partById, PARTS } from '../src/game/data/catalog';
import {
  firstAffordablePart,
  paletteState,
  orderedPalette,
  type PaletteContext,
} from '../src/game/simulation/editor-palette';
const context: PaletteContext = { avatar: true, level: 6, classId: 2, budget: 14, gp: 0, bp: 0 };
test('palette cost checks include their exact remaining-budget and complexity boundaries', () => {
  const basic = partById(2001)!;
  expect(paletteState(basic, { ...context, gp: 13, bp: 99 })).toMatchObject({
    affordable: true,
    locked: false,
  });
  expect(paletteState(basic, { ...context, gp: 14 })).toMatchObject({ reason: 'gun-points' });
  expect(paletteState(basic, { ...context, bp: 100 })).toMatchObject({ reason: 'complexity' });
  // Zero-GP bodies also dim while the build is already over budget.
  expect(paletteState(partById(1001)!, { ...context, gp: 15 })).toMatchObject({
    reason: 'gun-points',
  });
});
test('palette class requirements are inclusive, and lower-class weapons retain their upper bound', () => {
  const heavy = partById(2002)!,
    small = partById(2004)!;
  expect(paletteState(heavy, { ...context, classId: 1 })).toMatchObject({
    reason: 'minimum-class',
  });
  expect(paletteState(heavy, context).affordable).toBe(true);
  expect(paletteState(small, { ...context, classId: 3 }).affordable).toBe(true);
  expect(paletteState(small, { ...context, classId: 4 })).toMatchObject({
    reason: 'maximum-class',
  });
});
test('palette affordability is independent of locks and checks a single object before a mirrored drop', () => {
  const weapon = partById(2002)!;
  expect(paletteState(weapon, { ...context, level: 0 })).toMatchObject({
    locked: true,
    affordable: true,
  });
  expect(paletteState(weapon, { ...context, avatar: false, level: 0 })).toMatchObject({
    locked: false,
  });
  expect(paletteState(weapon, { ...context, budget: 2, gp: 0 })).toMatchObject({
    affordable: true,
  });
});
test('palette orders unlocked rows by cost and ID, and default selection can remain empty', () => {
  const rows = [partById(2002)!, partById(2001)!, partById(2004)!];
  expect(orderedPalette(rows, context).map((p) => p.id)).toEqual([2001, 2002, 2004]);
  expect(orderedPalette(rows, { ...context, level: 1 }).map((p) => p.id)).toEqual([
    2001, 2002, 2004,
  ]);
  expect(
    orderedPalette([{ ...partById(2001)!, tier: 3 }, partById(2002)!], {
      ...context,
      level: 1,
    }).map((p) => p.id),
  ).toEqual([2002, 2001]);
  expect(rows.map((p) => p.id)).toEqual([2002, 2001, 2004]);
  expect(firstAffordablePart(rows, context)).toBe(2001);
  expect(firstAffordablePart(rows, { ...context, classId: 1 })).toBe(2001);
  expect(firstAffordablePart(rows, { ...context, bp: 100 })).toBe(null);
  expect(
    firstAffordablePart(
      PARTS.filter((p) => p.id >= 3000 && p.id < 4000),
      { ...context, level: 1 },
    ),
  ).toBe(null);
});
