import { expect, test } from 'bun:test';
import {
  avatarLibraryTier,
  defaultUpgradeTank,
  upgradeClasses,
} from '../src/game/core/upgrade-offers';
import { AVATARS, STARTER } from '../src/game/data/catalog';
import { World } from '../src/game/simulation/world';
import { Random } from '../src/game/core/math';

test('fresh source fallback names match every recovered class/tier, including the level-two reference capture', () => {
  const names = [
    ['Infiltrator', 'Sturdy', null, null, null, null],
    ['Nimble', 'Heavy Seeker', 'Punisher', null, null, null],
    ['Super Nimble', 'Firestorm', 'Guardian', 'Hellbug', null, null],
    ['Striker', 'Aggressor', 'Shock and Awe', 'Super Hellbug', 'The One Tank', null],
    ['Super Striker', 'Inferno', 'Annihilator', 'Imperator', 'Battle-Bubble II', 'Destroyer'],
    ['Assassin', 'The Harbinger', 'Merciless', 'Death Larva', 'Nova Tank', 'The Forsaken'],
  ];
  for (let level = 1; level <= 6; ++level)
    expect(
      [1, 2, 3, 4, 5, 6].map((id) => defaultUpgradeTank(AVATARS, id, level)?.name ?? null),
    ).toEqual(names[level - 1]);
});

test('cached tier counts zero GP thresholds and higher unlocked-part tiers independently', () => {
  const body = { ...STARTER, parts: [STARTER.parts[0]] };
  expect(avatarLibraryTier(body)).toBe(0);
  expect(avatarLibraryTier({ ...body, classId: 4 })).toBe(2);
  expect(avatarLibraryTier({ ...body, classId: 6 })).toBe(4);
  const radar = { ...STARTER, parts: [...STARTER.parts, { ...STARTER.parts[1], type: 5001 }] };
  expect(avatarLibraryTier(radar)).toBe(2);
  const insidious = AVATARS.find((tank) => tank.name === 'Insidious')!;
  expect(avatarLibraryTier(insidious)).toBe(1);
  expect(defaultUpgradeTank([insidious], 1, 1)).toBe(insidious);
  expect(defaultUpgradeTank(AVATARS, 1, 1)?.name).toBe('Infiltrator');
  const legacy = { ...body, classId: 4, parts: [{ ...body.parts[0], type: 2013 }] };
  expect(avatarLibraryTier(legacy)).toBe(2); // Raw2013 adds no tier beyond the two zero-GP thresholds.
});

test('default lookup does not add current unlock or class caps absent from the cached record predicate', () => {
  const futureGun = {
    ...STARTER,
    parts: [
      STARTER.parts[0],
      { ...STARTER.parts[1], type: 2010 },
      ...Array.from({ length: 5 }, (_, index) => ({ ...STARTER.parts[1], key: `basic-${index}` })),
    ],
  };
  expect(avatarLibraryTier(futureGun)).toBe(5);
  expect(defaultUpgradeTank([futureGun], 1, 5)).toBe(futureGun);
  const zeroBudget = { ...STARTER, classId: 4, parts: [STARTER.parts[0]] };
  expect(defaultUpgradeTank([zeroBudget], 4, 2)).toBe(zeroBudget);
  const levelZero = { ...zeroBudget, classId: 1 };
  expect(defaultUpgradeTank([levelZero], 1, 0)).toBe(levelZero);
});

test('GetDefaultTank takes the last exact local avatar, never under-budget or mismatched-tier substitutes', () => {
  const builtin = AVATARS.find((tank) => tank.name === 'Infiltrator')!;
  const first = { ...builtin, id: 'L-first', name: 'First saved match', sourceCode: undefined };
  const newest = { ...first, id: 'L-newest', name: 'Newest saved match' };
  const enemy = { ...newest, avatar: false };
  const underBudget = { ...STARTER, id: 'L-under' };
  expect(defaultUpgradeTank([...AVATARS, first, newest, enemy, underBudget], 1, 1)).toBe(newest);
  expect(defaultUpgradeTank([underBudget], 1, 1)).toBeNull();
  expect(defaultUpgradeTank([], 1, 1)).toBeNull();
  expect(defaultUpgradeTank([STARTER], 1, 0)).toBeNull();
});

test('adjacent slots retain source class order and offline fallback consumes preference rolls without randomizing defaults', () => {
  expect(upgradeClasses(1)).toEqual([1, 2]);
  expect(upgradeClasses(3)).toEqual([2, 3, 4]);
  expect(upgradeClasses(6)).toEqual([5, 6]);
  for (const seed of [1, 2, 3, 10]) {
    const world = new World([], [], seed);
    world.progression.level = 1;
    const expected = new Random(world.rng.state);
    expected.int(1, 2);
    expected.int(1, 2);
    expect(world.getOffers().map((tank) => tank.name)).toEqual(['Infiltrator', 'Sturdy']);
    expect(world.rng.state).toBe(expected.state);
  }
});

test('live saved-avatar library is independent of enemy roster and does not replace an already offered snapshot', () => {
  const world = new World([], [], 1);
  world.progression.level = 1;
  const builtin = AVATARS.find((tank) => tank.name === 'Infiltrator')!;
  const saved = { ...builtin, id: 'L-saved', name: 'Saved avatar', sourceCode: undefined };
  world.avatarLibrary = [saved];
  world.offers = world.getOffers();
  expect(world.localTanks).toHaveLength(0);
  expect(world.offers[0]).toBe(saved);
  world.avatarLibrary = [];
  expect(world.offers[0]).toBe(saved);
  expect(world.getOffers()[0]).toBe(builtin);
});
