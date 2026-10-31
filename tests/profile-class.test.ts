import { expect, test } from 'bun:test';
import { ProfileClassAllowance } from '../src/game/core/profile-class';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER, AVATARS } from '../src/game/data/catalog';
import { tankLoadEligibility } from '../src/game/core/tank-eligibility';
import { viewerSelectionError } from '../src/game/core/tank-viewer';

test('profile class stores the last upgrade allowance, survives damage, and can fall on a later upgrade', () => {
  const world = new World([], [], 1);
  expect(world.profileClass.value).toBe(1);
  for (let i = 0; i < 3; i++) {
    world.player.life = world.player.maxLife;
    world.step(emptyInput());
    world.selectUpgrade(STARTER);
  }
  expect([world.progression.level, world.profileClass.value]).toEqual([3, 4]);
  for (let i = 0; i < 2; i++) {
    world.damage(world.player, 100000);
    for (let frame = 0; frame < 25; frame++) world.step(emptyInput());
  }
  expect([world.progression.level, world.profileClass.value]).toEqual([1, 4]);
  world.player.life = world.player.maxLife;
  world.step(emptyInput());
  expect([world.progression.level, world.profileClass.value]).toEqual([2, 3]);
});
test('the app-session profile allowance is shared across worlds, not inferred from saved history or permanently maximized', () => {
  const profile = new ProfileClassAllowance();
  profile.recordUpgrade(6);
  expect(profile.value).toBe(6);
  const world = new World([], [], 1, undefined, profile);
  expect(world.profileClass.value).toBe(6);
  world.player.life = world.player.maxLife;
  world.step(emptyInput());
  expect(profile.value).toBe(2);
  const restored = new World([], [STARTER, STARTER, STARTER, STARTER], 1);
  expect([restored.progression.level, restored.profileClass.value]).toEqual([3, 1]);
});
test('stored profile class does not grant a higher current-level selection limit or get normalized into the source label', () => {
  const body = { ...STARTER, classId: 3, parts: [STARTER.parts[0]] },
    limits = { level: 1, maxClass: 2, profileMaxClass: 4, gunPoints: 2 };
  expect(tankLoadEligibility(body, limits)).toMatchObject({
    classLimit: 2,
    overClass: true,
    capacityLabel: '',
  });
  expect(viewerSelectionError(body, true, limits)).toBe('Exceeds your ');
  const fury = AVATARS.find((tank) => tank.name === 'Fury')!;
  expect(
    viewerSelectionError(fury, true, {
      level: 1,
      maxClass: 2,
      profileMaxClass: 4,
      gunPoints: 2,
      unlockedParts: fury.parts.map((p) => p.type),
    }),
  ).toBe('Exceeds your Gun Points');
});
test('a low stored profile class can appear in rejection copy while current-level class validation allows it', () => {
  const fury = AVATARS.find((tank) => tank.name === 'Fury')!,
    tank = { ...fury, parts: [...fury.parts, { ...STARTER.parts[1], key: 'extra' }] },
    limits = { level: 3, maxClass: 4, profileMaxClass: 1, gunPoints: 7 };
  expect(tankLoadEligibility(tank, limits)).toMatchObject({
    classLimit: 4,
    overClass: false,
    overGunPoints: true,
    capacityLabel: 'Gun Points, Class',
  });
  expect(viewerSelectionError(tank, true, limits)).toBe('Exceeds your Gun Points, Class');
});
