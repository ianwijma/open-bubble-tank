import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

const moving: [Projectile['kind'], number][] = [
  ['shell', 1721],
  ['pierce', 1728],
  ['buster', 1800],
  ['ricochet', 1946],
  ['rocket', 2176],
  ['apocalypse', 2058],
];

for (const [kind, symbol] of moving)
  test(`${kind} movement reads the preceding twip pose instead of accumulating subpixel residue`, () => {
    for (const [angle, x, y] of [
      [45, 21, 21],
      [135, -21, 21],
      [-45, 21, -21],
      [-135, -21, -21],
    ]) {
      const world = new World([], [], 42);
      world.hitTest = () => false;
      world.field.enemies = [];
      const bullet = createProjectile(world.nextId(), {
        owner: world.player.uid,
        enemy: false,
        kind,
        symbol,
        x: 0,
        y: 0,
        angle,
        speed: 3,
        damage: 1,
        wobbleAmplitude: 0,
      });
      world.addBullet(bullet);
      for (let frame = 0; frame < 10; frame++) tickBullet(world, bullet, emptyInput());
      expect([bullet.x, bullet.y]).toEqual([x, y]);
      expect(bullet.dead).toBe(false);
    }
  });

test('deflected movement quantizes each display write without rounding the retained vector', () => {
  const world = new World([], [], 42);
  const motion = { x: -Math.SQRT1_2 * 3, y: Math.SQRT1_2 * 3 };
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: true,
    kind: 'shell',
    symbol: 1717,
    x: 0,
    y: 0,
    angle: 0,
    speed: 9,
    damage: 1,
    deflected: { ...motion },
  });
  world.addBullet(bullet);
  for (let frame = 0; frame < 10; frame++) tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([-21, 21]);
  expect(bullet.deflected).toEqual(motion);
  expect(bullet.dead).toBe(false);
});

test('contact samples the preceding displayed pose on each ordinary Run', () => {
  const world = new World([], [], 42);
  world.field.enemies = [createTank(world.nextId(), STARTER, 'enemy', 100, 0)];
  const samples: number[][] = [];
  world.hitTest = (_tank, x, y) => {
    samples.push([x, y]);
    return false;
  };
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    angle: 45,
    speed: 3,
    damage: 1,
  });
  world.addBullet(bullet);
  for (let frame = 0; frame < 3; frame++) tickBullet(world, bullet, emptyInput());
  expect(samples).toEqual([
    [0, 0],
    [2.1, 2.1],
    [4.2, 4.2],
  ]);
  expect([bullet.x, bullet.y]).toEqual([6.3, 6.3]);
});

test('deflected wall testing follows both quantized display writes', () => {
  const world = new World([], [], 42);
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 414.95,
    y: -10,
    angle: 0,
    speed: 3,
    damage: 1,
    // A length10 copied Buster vector; its tiny negative residual truncates to0.
    deflected: { x: 0.06, y: Math.sqrt(100 - 0.06 ** 2) },
  });
  world.addBullet(bullet);
  tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([415, 0]);
  expect(bullet.dead).toBe(false);
  expect(world.stats.friendlyMissed).toBe(0);
  tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([415.05, 9.95]);
  expect(bullet.dead).toBe(true);
  expect(world.stats.friendlyMissed).toBe(1);
});
