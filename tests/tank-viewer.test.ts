import { expect, test } from 'bun:test';
import { AVATARS, ENEMIES, STARTER } from '../src/game/data/catalog';
import type { TankDesign } from '../src/game/core/types';
import {
  localViewerTanks,
  sortViewerTanks,
  viewerSelectionError,
  viewerEditError,
  viewerEditWarning,
  viewerFit,
  viewerPartSummary,
  viewerEquipmentFields,
} from '../src/game/core/tank-viewer';

const tank = (types: number[], change: Partial<TankDesign> = {}): TankDesign => ({
  ...STARTER,
  classId: 1,
  parts: types.map((type, i) => ({ ...STARTER.parts[0], key: String(i), type })),
  ...change,
});
test('offline viewer lists retain builtin order, matching mode and the first stable ID', () => {
  const custom = { ...STARTER, id: 'L1', name: 'Custom' },
    duplicate = { ...AVATARS[0], name: 'Duplicate' };
  const input = [
    { ...custom, avatar: false },
    custom,
    { ...custom, name: 'Later' },
    duplicate,
    ENEMIES[0],
  ];
  const avatars = localViewerTanks(input, true);
  expect(avatars).toHaveLength(AVATARS.length + 1);
  expect(avatars[0]).toBe(AVATARS[0]);
  expect(avatars.at(-1)).toBe(custom);
  expect(localViewerTanks([custom], false)).toEqual([...ENEMIES]);
  expect(input[2].name).toBe('Later');
});
test('viewer name and author sorts are ascending and case-insensitive with a stable tie adapter', () => {
  const designs = ['zeta', 'alpha', 'ALPHA'].map((name, i) =>
    tank([], { id: String(i), name, author: name }),
  );
  expect(sortViewerTanks(designs, 'name').map((t) => t.id)).toEqual(['1', '2', '0']);
  expect(sortViewerTanks(designs, 'author').map((t) => t.id)).toEqual(['1', '2', '0']);
  expect(designs.map((t) => t.id)).toEqual(['0', '1', '2']);
});
test('viewer class, gun and bubble sorts compare numerical values rather than strings', () => {
  const designs = [
    tank(Array(12).fill(2001), { id: 'many', classId: 6 }),
    tank([2002], { id: 'heavy', classId: 2 }),
    tank([1001], { id: 'body', classId: 1 }),
  ];
  for (const sort of ['classId', 'guns', 'bubbles'] as const)
    expect(sortViewerTanks(designs, sort).map((t) => t.id)).toEqual(['body', 'heavy', 'many']);
});
test('viewer selection uses the candidate class budget and leaves BP rejection to creator validation', () => {
  const limits = { level: 2, maxClass: 3, gunPoints: 3 };
  expect(viewerEditError(tank(Array(4).fill(2001), { classId: 2 }), limits)).toBe('');
  expect(viewerEditError(tank(Array(101).fill(1001)), limits)).toBe('');
  expect(viewerEditError(tank(Array(2).fill(2001)), { level: 1, maxClass: 1, gunPoints: 0 })).toBe(
    '',
  );
});
test('viewer action errors preserve specific gun/class reason ordering and distinct hover copy', () => {
  const limits = { level: 0, maxClass: 1, gunPoints: 999 };
  expect(viewerEditError(tank(Array(3).fill(2001)), limits)).toBe('Exceeds your Gun Points');
  expect(viewerEditError(tank([1001], { classId: 2 }), limits)).toBe('Exceeds your Class');
  const both = tank(Array(3).fill(2001), { classId: 2 });
  expect(viewerEditError(both, limits)).toBe('Exceeds your Gun Points, Class');
  expect(viewerEditWarning(both, limits)).toBe('Exceeds your Class, Gun, or Bubble Points');
});
test('viewer missing-part errors are separate from budget failures and preserve source phase strings', () => {
  const limits = { level: 0, maxClass: 1, gunPoints: 999 };
  expect(viewerEditError(tank([2002]), limits)).toBe('Do not have all the parts for this tank');
  const both = tank(Array(3).fill(2002));
  expect(viewerEditError(both, limits)).toBe('Do not have the parts and exceeds Gun Points');
  expect(viewerEditWarning(both, limits)).toBe('Exceeds Parts, and Class, Gun, or Bubble Points');
  expect(viewerEditError(tank([9999]), limits)).toBe('Do not have all the parts for this tank');
});
test('enemy editing and rollover use level-six budgets while enemy selection bypasses restrictions', () => {
  const limits = { level: 0, maxClass: 1, gunPoints: 0 };
  expect(viewerEditError(tank([4001], { avatar: false, classId: 6 }), limits)).toBe('');
  expect(viewerEditError(tank([3001], { avatar: false }), limits)).toBe(
    'Do not have all the parts for this tank',
  );
  expect(viewerEditError(tank(Array(19).fill(4001), { avatar: false }), limits)).toBe('');
  const over = tank(Array(20).fill(4001), { avatar: false });
  expect(viewerEditError(over, limits)).toBe('Exceeds your Gun Points');
  expect(viewerEditWarning(over, limits)).toBe('Exceeds your Class, Gun, or Bubble Points');
  expect(viewerSelectionError(over, false, limits)).toBe('');
  expect(viewerSelectionError(tank([3001], { avatar: false }), false, limits)).toBe('');
  expect(viewerSelectionError(tank(Array(3).fill(2001)), true, limits)).toBe(
    viewerEditError(tank(Array(3).fill(2001)), limits),
  );
});
test('viewer gates use current level while class reason labels retain the stored profile readout', () => {
  const design = tank([1001], { classId: 2 });
  expect(viewerEditError(design, { level: 1, maxClass: 1, gunPoints: 0 })).toBe('');
  expect(viewerEditError(design, { level: 0, maxClass: 1, profileMaxClass: 3, gunPoints: 0 })).toBe(
    'Exceeds your ',
  );
  expect(
    viewerEditWarning(design, { level: 0, maxClass: 1, profileMaxClass: 3, gunPoints: 0 }),
  ).toBe('Exceeds your Class, Gun, or Bubble Points');
});
test('viewer stored unlock lists override tier fallback and never lock decorative body parts', () => {
  const limits = { level: 0, maxClass: 1, gunPoints: 0, unlockedParts: [2002] };
  expect(viewerEditError(tank([2002, 1600]), limits)).toBe('');
  expect(viewerEditError(tank([2001]), limits)).toBe('Do not have all the parts for this tank');
  expect(viewerEditError(tank([2001]), { ...limits, level: 6, unlockedParts: [] })).toBe(
    'Do not have all the parts for this tank',
  );
});
test('viewer summaries preserve first-name occurrence order, source counts and trailing newline', () => {
  expect(viewerPartSummary(tank([4001, 1001, 4001, 6003]))).toBe(
    '2 x Basic Cannon\n1 x Small Bubble\n1 x Skittish\n',
  );
  const enemy = viewerEquipmentFields(tank([6003, 4001, 1001, 4001, 6001], { avatar: false }));
  expect(enemy).toMatchObject({
    bubblesLeft_txt: '9',
    gunPoints_txt: '2',
    class_txt: '1',
    primary_txt: '2 Basic Cannons',
    secondary_txt: 'Aggressor, Skittish',
    passive_txt: '',
  });
  expect(enemy.PrimarySecondary_txt).toBe('Enemy Weapons:\n\n\n\nBehavior Parts:');
  const avatar = viewerEquipmentFields(tank([2001, 2001, 3001, 5001]));
  expect(avatar).toMatchObject({
    primary_txt: '2 Basic Cannons',
    secondary_txt: 'Sticky Burst',
    passive_txt: 'Radar',
  });
  expect(avatar.PrimarySecondary_txt).toBe(
    'Primary Weapons:\n\n\n\nSecondary Weapons:\n\n\n\nPassive Weapons:',
  );
});
test('viewer equipment abbreviations count distinct IDs per category and retain numeric ID order', () => {
  const fields = viewerEquipmentFields(tank([2003, 2001, 2002, 2001]));
  expect(fields.primary_txt).toBe("2 BC's, 1 HC, 1 MG");
  expect(viewerEquipmentFields(tank([4003, 4001, 4002, 4001], { avatar: false })).primary_txt).toBe(
    "2 BC's, 1 S, 1 ES",
  );
});
test('viewer initial fit includes invisible helpers at absolute mount extremes and never enlarges', () => {
  const wide = tank([1001]);
  wide.parts[0] = { ...wide.parts[0], x: 120, y: 0, radius: 1000 };
  expect(viewerFit(wide, [{ x: 110, y: -10, width: 20, height: 20 }], 100, 100)).toBeCloseTo(
    100 / 256.5,
    10,
  );
  const tall = { ...wide, parts: wide.parts.map((p) => ({ ...p, x: 0, y: -200 })) };
  expect(viewerFit(tall, [], 100, 80)).toBeCloseTo(80 / 413, 10);
  expect(viewerFit(tank([]), [], 100, 100)).toBe(1);
  expect(viewerFit(tank([]), [{ x: -100, y: -100, width: 200, height: 200 }], 100, 50)).toBe(0.25);
});
