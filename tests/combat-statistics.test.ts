import { expect, test } from 'bun:test';
import { FieldVisit } from '../src/game/core/field-visit';
import { FIELD_RADIUS } from '../src/game/core/constants';
import type { TankDesign } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { collectPickups } from '../src/game/simulation/pickups';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

function setup(
  key = 'Fighter',
  design: TankDesign = { ...STARTER, avatar: false, speed: 0, reward: 0 },
) {
  const world = new World([], [], 31);
  world.player.x = -200;
  world.hitTest = () => false;
  world.roster.units = new Map([[key, [design]]]);
  const tank = createTank(world.nextId(), design, 'enemy', 100, 0);
  world.field.enemies = [tank];
  return { world, tank };
}

test('death callback counts total kills now, while classification and medals wait for active removal', () => {
  const { world, tank } = setup('SmallFighter');
  world.stats.fighters = 99;
  world.kill(tank);
  expect([world.stats.kills, world.stats.fighters, world.field.enemies.includes(tank)]).toEqual([
    1,
    99,
    true,
  ]);
  world.kill(tank);
  expect(world.stats.kills).toBe(1);
  world.pause();
  world.step(emptyInput());
  expect(world.stats.fighters).toBe(99);
  expect(world.achievements.has('Dogfighter')).toBe(false);
  world.resume();
  world.step(emptyInput());
  expect(world.stats.fighters).toBe(100);
  expect(world.achievements.has('Dogfighter')).toBe(true);
  expect(world.field.enemies).not.toContain(tank);
});

test('roster labels classify kills, not gun points, design names or undeclared identities', () => {
  for (const [key, deadheads, fighters] of [
    ['Balanced', 0, 0],
    ['TinyDeadHead', 1, 0],
    ['HeavyFighter', 0, 1],
  ] as const) {
    const { world, tank } = setup(key, {
      ...STARTER,
      avatar: false,
      name: 'DeadHead Fighter',
      reward: 0,
    });
    world.kill(tank);
    world.flushEnemyRemovals();
    expect([world.stats.deadheads, world.stats.fighters]).toEqual([deadheads, fighters]);
  }
  const { world, tank } = setup();
  world.roster.units.clear();
  world.kill(tank);
  world.flushEnemyRemovals();
  expect([world.stats.deadheads, world.stats.fighters]).toEqual([0, 0]);
});

test('removal preserves death queue order and checks each exact counter before detaching', () => {
  const { world, tank } = setup('SmallDeadHead');
  const second = createTank(world.nextId(), tank.design, 'enemy', 200, 0);
  world.field.enemies.push(second);
  world.stats.deadheads = 199;
  world.kill(second);
  world.kill(tank);
  const observed: [number, boolean, boolean][] = [];
  world.onAchievement = (name) => {
    if (name === 'Headhunter')
      observed.push([
        world.stats.deadheads,
        world.field.enemies.includes(second),
        world.field.enemies.includes(tank),
      ]);
  };
  world.flushEnemyRemovals();
  expect(observed).toEqual([[200, true, true]]);
  expect(world.stats.deadheads).toBe(201);
  expect(world.field.enemies).toEqual([]);
});

test('David and Goliath uses exact HeavyMiniBoss and the avatar level at removal', () => {
  for (const [key, level, awarded] of [
    ['HeavyMiniBoss', 3, true],
    ['HeavyMiniBoss', 4, false],
    ['VeryHeavy', 1, false],
  ] as const) {
    const { world, tank } = setup(key);
    world.progression.level = 0;
    world.kill(tank);
    world.progression.level = level;
    world.flushEnemyRemovals();
    expect(world.achievements.has('David and Goliath')).toBe(awarded);
  }
});

test('protected outside checks can skip exactly50, so later removals do not grant Pro Sumo', () => {
  const { world, tank } = setup();
  tank.x = FIELD_RADIUS + 10;
  tank.shield = 100;
  const second = createTank(world.nextId(), tank.design, 'enemy', FIELD_RADIUS + 10, 10);
  second.shield = 100;
  world.field.enemies.push(second);
  world.stats.sumo = 49;
  world.step(emptyInput());
  expect([world.stats.sumo, tank.dead, second.dead]).toEqual([51, false, false]);
  world.kill(tank);
  world.flushEnemyRemovals();
  expect(world.achievements.has('Pro Sumo')).toBe(false);
  world.stats.sumo = 50;
  world.kill(second);
  world.flushEnemyRemovals();
  expect(world.achievements.has('Pro Sumo')).toBe(true);
});

test('piercing contact flushes the queue immediately after direct damage', () => {
  const { world, tank } = setup();
  world.stats.fighters = 99;
  world.hitTest = (t) => t === tank;
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'pierce',
    symbol: 1824,
    x: tank.x,
    y: tank.y,
    angle: 0,
    speed: 0,
    damage: 999,
  });
  world.addBullet(bullet);
  tickBullet(world, bullet, emptyInput());
  expect(world.stats.kills).toBe(1);
  expect(world.stats.fighters).toBe(100);
  expect(world.achievements.has('Dogfighter')).toBe(true);
  expect(world.field.enemies).toEqual([]);
});

test('area damage flushes existing and newly queued enemy deaths before returning', () => {
  const { world, tank } = setup();
  world.stats.fighters = 99;
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'flak',
    symbol: 2031,
    x: tank.x,
    y: tank.y,
    angle: 0,
    speed: 0,
    damage: 999,
  });
  world.explode(bullet, 60, 999);
  expect([world.stats.kills, world.stats.fighters, world.stats.damageDone]).toEqual([1, 100, 0]);
  expect(world.field.enemies).toEqual([]);
});

test('Apocalypse damage respects protection and counts callbacks without removal-category medals', () => {
  const { world, tank } = setup('SmallDeadHead');
  const protectedTank = createTank(world.nextId(), tank.design, 'enemy', 200, 0);
  protectedTank.shield = 1000;
  world.field.enemies.push(protectedTank);
  const ally = createTank(world.nextId(), { ...STARTER, avatar: false, reward: 0 }, 'ally');
  world.allies.push(ally);
  world.stats.deadheads = 199;
  world.beginCollapse(0);
  for (let i = 0; i < 120; i++) world.step(emptyInput());
  expect([tank.dead, protectedTank.dead, ally.dead]).toEqual([true, false, true]);
  expect([world.stats.kills, world.stats.deadheads, world.stats.completed]).toEqual([1, 199, 0]);
  expect(world.achievements.has('Headhunter')).toBe(false);
  expect(world.field.enemies).toEqual([]);
  expect(world.runtimeFor(world.field).enemyRemovals).toEqual([]);
});

test('collected statistic counts objects while healing retains denomination values', () => {
  const { world } = setup();
  world.player.life = 1;
  world.player.maxLife = 100;
  world.hitTest = () => true;
  world.pickups = [1, 5, 50].map((value) => ({
    uid: world.nextId(),
    x: 0,
    y: 0,
    value,
    rotation: 0,
    vx: 0,
    vy: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  }));
  collectPickups(world);
  expect(world.player.life).toBe(57);
  expect(world.stats.collected).toBe(3);
});

test('shot counters split accepted friendly/enemy births and exclude transit rejections', () => {
  const { world } = setup();
  const make = (enemy: boolean) =>
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy,
      kind: 'shell',
      symbol: 1721,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
    });
  world.addBullet(make(false));
  world.addBullet(make(true));
  expect([world.stats.shots, world.stats.enemyShots]).toEqual([1, 1]);
  world.jump({ x: 1, y: 0 });
  world.addBullet(make(false));
  world.addBullet(make(true));
  expect([world.stats.shots, world.stats.enemyShots]).toEqual([1, 1]);
});

test('boss win preparation precedes awards and Masochist checks each coordinate extreme', () => {
  const { world } = setup();
  world.field.enemies = [];
  world.field.boss = true;
  world.fieldVisit = new FieldVisit();
  world.stats.visited = 2;
  world.fields.set('5,0', { ...world.field, col: 5, row: 0 });
  world.fields.set('0,2', { ...world.field, col: 0, row: 2 });
  const modes: string[] = [];
  world.onAchievement = () => modes.push(world.mode);
  world.step(emptyInput());
  expect(modes).toEqual(['won', 'won']);
  expect(
    world
      .drainEvents()
      .filter((event) => ['win', 'achievement'].includes(event.type))
      .map((event) => event.type),
  ).toEqual(['win', 'achievement', 'achievement']);
  expect(world.achievements.has('Masochist')).toBe(true);
});

test('Explorer triggers only on creating the hundredth unique field, not revisits or later counts', () => {
  for (const [existing, awarded] of [
    [100, true],
    [101, false],
  ] as const) {
    const { world } = setup();
    for (let i = 1; i < existing; i++)
      world.fields.set(`${i},10`, { ...world.field, col: i, row: 10, enemies: [] });
    world.jump({ x: 1, y: 0 });
    expect(world.stats.visited).toBe(existing);
    expect(world.achievements.has('Explorer')).toBe(awarded);
  }
  const { world } = setup();
  world.stats.visited = 100;
  world.fields.set('1,0', { ...world.field, col: 1, enemies: [], cleared: true });
  world.jump({ x: 1, y: 0 });
  expect(world.achievements.has('Explorer')).toBe(false);
});
