import { importAvatarFixture } from '../tools/fixtures/avatar-attachments';
import { importActorFixtures } from './fixtures/actor-attachments';
import { FieldVisit } from '../src/game/core/field-visit';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { applyProjectileStatus, decorateStatus } from '../src/game/simulation/status';
import { World, emptyInput } from '../src/game/simulation/world';
import { WEAPONS } from '../src/game/data/weapons';

function frames(world: World, count: number) {
  for (let i = 0; i < count; i++) world.step(emptyInput());
}
function patientWorld() {
  const world = new World([], [], 10);
  const tank = createTank(
    100,
    { ...STARTER, avatar: false, speed: 0, life: 100, parts: [STARTER.parts[0]] },
    'enemy',
    100,
    0,
  );
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.field.enemies = [tank];
  importActorFixtures(world);
  return { world, tank };
}

test('infection ticks twelve active frames after infection, independently of tank age', () => {
  const { world, tank } = patientWorld();
  tank.age = tank.artAge = 11;
  applyProjectileStatus(world, tank, 'infect');
  frames(world, 11);
  expect(tank.life).toBe(100);
  expect(tank.infectCounter).toBe(11);
  applyProjectileStatus(world, tank, 'infect');
  expect(tank.infectStartedAt).toBe(11);
  frames(world, 1);
  expect(tank.life).toBe(99);
  expect(tank.infectCounter).toBe(0);
  frames(world, 12);
  expect(tank.life).toBe(98);
  expect(tank.status.infect).toBe(Infinity);
});

test('stun freezes other status clocks while attached effect animation still expires', () => {
  const { world, tank } = patientWorld();
  for (const kind of ['jam', 'sticky', 'weaken', 'infect'] as const)
    applyProjectileStatus(world, tank, kind);
  frames(world, 7);
  const jam = tank.status.jam,
    sticky = tank.status.sticky,
    weaken = tank.status.weaken;
  applyProjectileStatus(world, tank, 'stun', 3);
  frames(world, 4); // Three counter frames plus the source's state-reset frame.
  expect(tank.stunned).toBe(true);
  expect(tank.status.jam).toBe(jam);
  expect(tank.status.sticky).toBe(sticky);
  expect(tank.status.weaken).toBe(weaken);
  expect(tank.infectCounter).toBe(7);
  expect(tank.statusDecoration).toBeUndefined();
  frames(world, 1);
  expect(tank.stunned).toBe(false);
  expect(tank.status.jam).toBe(jam - 1);
  expect(tank.infectCounter).toBe(8);
});

test('forcefield blocks sticky and jam callbacks, while infection retains its own callback', () => {
  const { world } = patientWorld();
  const tank = createTank(
    101,
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5005 }] },
    'player',
  );
  for (const kind of ['sticky', 'jam', 'ink'] as const) applyProjectileStatus(world, tank, kind);
  expect(tank.status.sticky).toBe(0);
  expect(tank.status.jam).toBe(0);
  expect(tank.status.ink).toBe(121);
  expect(
    world.runtimeFor(world.field).effectQueue.filter((e) => e.layer === 'screen'),
  ).toHaveLength(0);
  expect(tank.statusDecoration).toBeUndefined();
  applyProjectileStatus(world, tank, 'infect');
  expect(tank.status.infect).toBe(Infinity);
});

test('ink timer affects only the avatar and does not refresh until its existing timer ends', () => {
  const { world, tank } = patientWorld();
  applyProjectileStatus(world, tank, 'ink');
  expect(tank.status.ink).toBe(0);
  world.player.age = world.player.artAge = 17;
  applyProjectileStatus(world, world.player, 'ink');
  frames(world, 40);
  expect(world.player.status.ink).toBe(81);
  applyProjectileStatus(world, world.player, 'ink');
  expect(world.player.status.ink).toBe(81);
  expect(world.effects.filter((e) => e.layer === 'screen')).toHaveLength(2);
  frames(world, 81);
  expect(world.player.status.ink).toBe(0);
  applyProjectileStatus(world, world.player, 'ink');
  expect(
    world.runtimeFor(world.field).effectQueue.filter((e) => e.layer === 'screen'),
  ).toHaveLength(1);
});

test('status artwork covers every part below five and replaces previous marks', () => {
  const { world, tank } = patientWorld();
  tank.design = {
    ...tank.design,
    parts: [0, 20, 40].map((x, i) => ({ ...STARTER.parts[0], key: `part-${i}`, x })),
  };
  decorateStatus(world, tank, 'jam');
  expect(tank.statusDecoration?.marks.map((mark) => mark.x)).toEqual([0, 20, 40]);
  const old = tank.statusDecoration;
  decorateStatus(world, tank, 'sticky');
  expect(tank.statusDecoration).not.toBe(old);
  expect(tank.statusDecoration?.kind).toBe('sticky');
  frames(world, 80);
  expect(tank.statusDecoration?.marks).toHaveLength(3);
  frames(world, 1);
  expect(tank.statusDecoration).toBeUndefined();
});

for (const partCount of [5, 7])
  test(`status marks use rounded repeated indices before each pose for ${partCount} parts`, () => {
    const { world, tank } = patientWorld();
    tank.design = {
      ...tank.design,
      parts: Array.from({ length: partCount }, (_, i) => ({
        ...STARTER.parts[0],
        key: `part-${i}`,
        x: i * 20,
        y: -i * 10,
      })),
    };
    // Each original mark draws a part index, rotation, then variant; repeats are retained.
    const edge = partCount === 5 ? 0.19 : 0.14;
    const opposite = partCount === 5 ? 0.81 : 0.86;
    const draws = [edge, 0, 0, edge, 0.5, 0.99, opposite, 0.25, 0.6, 0, 0.9, 0.3, 0.99, 0.1, 0.8];
    let cursor = 0;
    world.rng.next = () => {
      expect(cursor).toBeLessThan(draws.length);
      return draws[cursor++];
    };
    decorateStatus(world, tank, 'jam');
    const indices = partCount === 5 ? [1, 1, 3, 0, 4] : [1, 1, 5, 0, 6];
    expect(tank.statusDecoration?.marks).toEqual(
      indices.map((index, i) => ({
        x: index * 20,
        y: -index * 10,
        angle: [-180, 0, -90, 144, -144][i],
        frame: [1, 4, 3, 2, 4][i],
      })),
    );
    expect(cursor).toBe(15);
  });

test('below five parts status marks preserve detail order without index draws', () => {
  const { world, tank } = patientWorld();
  tank.design = {
    ...tank.design,
    parts: [0, 20, 40, 60].map((x, i) => ({ ...STARTER.parts[0], key: `part-${i}`, x })),
  };
  let draws = 0;
  world.rng.next = () => {
    draws++;
    return 0.5;
  };
  decorateStatus(world, tank, 'stun');
  expect(tank.statusDecoration?.marks).toEqual(
    [0, 20, 40, 60].map((x) => ({ x, y: STARTER.parts[0].y, angle: 0, frame: 3 })),
  );
  expect(draws).toBe(8);
});

test('forcefield regeneration measures twenty damaged frames rather than tank age', () => {
  const world = new World([], [], 10);
  world.player = createTank(
    100,
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5005 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  importAvatarFixture(world);
  world.player.age = world.player.artAge = 19;
  world.damage(world.player, 20);
  frames(world, 1);
  expect(world.player.forcefield).toBe(20);
  frames(world, 18);
  expect(world.player.forcefield).toBe(20);
  frames(world, 1);
  expect(world.player.forcefield).toBe(21);
});

test('forcefield impact returns to idle and broken/rearm clips follow the authored frame scripts', () => {
  const world = new World([], [], 10);
  world.player = createTank(
    100,
    { ...STARTER, parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'field', type: 5005 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  importAvatarFixture(world);
  const tank = world.player;
  world.spawnVolley(tank, tank.guns[0], WEAPONS[2001]);
  const shot = world.bullets[0];
  shot.x = 100;
  shot.y = 0;
  shot.speed = 0;
  world.damage(tank, 10, shot);
  expect(tank.forcefieldFrame).toBe(2);
  expect(tank.forcefieldAngle).toBe(0);
  frames(world, 23);
  expect(tank.forcefieldFrame).toBe(1);
  // Reset the source's partial recharge counter to isolate one full 320-frame break.
  tank.forcefieldCounter = 0;
  world.damage(tank, tank.forcefield, shot);
  expect(tank.forcefieldFrame).toBe(26);
  frames(world, 9);
  expect(tank.forcefieldFrame).toBe(26);
  expect(tank.forcefieldReady).toBe(false);
  frames(world, 311);
  // Active recharge selects36; the same stage frame advances the playing clip.
  expect(tank.forcefieldFrame).toBe(37);
  expect(tank.forcefieldReady).toBe(true);
  frames(world, 29);
  expect(tank.forcefieldFrame).toBe(1);
});
