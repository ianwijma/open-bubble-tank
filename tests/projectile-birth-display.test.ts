import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

function setup() {
  const world = new World([], [], 42);
  world.hitTest = world.hitProjectile = () => false;
  world.player.x = world.player.y = 100;
  const enemy = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      parts: [{ ...STARTER.parts[0], x: 0, y: 0 }],
    },
    'enemy',
    200,
    200,
  );
  world.field.enemies = [enemy];
  world.actorParents.sync(world);
  return { world, enemy };
}
function shot(
  world: World,
  kind: Projectile['kind'],
  symbol: number,
  extra: Partial<Projectile> = {},
) {
  return createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind,
    symbol,
    x: 0,
    y: 0,
    angle: 45,
    speed: 3,
    damage: 1,
    ...extra,
  });
}

for (const [kind, symbol] of [
  ['shell', 1721],
  ['beam', 1992],
  ['whip', 2036],
  ['healBeam', 2015],
] as [Projectile['kind'], number][])
  test(`${kind} birth supplies the displayed pose before returning`, () => {
    const { world } = setup();
    const bullet = shot(world, kind, symbol, { x: 13.079, y: -5.039 });
    expect(world.addBullet(bullet)).toBe(true);
    expect([bullet.x, bullet.y]).toEqual([13.05, -5]);
    expect(world.hasBulletParent(bullet)).toBe(true);
  });

for (const kind of ['sapper', 'seeker'] as const)
  test(`${kind} virtual Setup steers from the already assigned birth pose`, () => {
    const { world, enemy } = setup();
    enemy.x = enemy.y = 100;
    const bullet = shot(world, kind, kind === 'sapper' ? 1831 : 1827, {
      x: 0.049,
      y: 0.099,
      enemy: kind === 'sapper',
      owner: kind === 'sapper' ? enemy.uid : world.player.uid,
    });
    world.addBullet(bullet);
    expect([bullet.x, bullet.y]).toEqual([0, 0.05]);
    expect(bullet.angle).toBeCloseTo((Math.atan2(99.95, 100) * 180) / Math.PI, 12);
  });

for (const [kind, symbol] of [
  ['star', 1811],
  ['push', 2221],
  ['spin', 2033],
  ['grow', 1943],
  ['flak', 2031],
  ['seeker', 1827],
  ['sapper', 1831],
] as [Projectile['kind'], number][])
  test(`${kind} custom movement stores each displayed step`, () => {
    const { world, enemy } = setup();
    // Isolate Grow's zero-jitter branch; all position writes still use real vector arithmetic.
    world.rng.int = () => 0;
    const bullet = shot(world, kind, symbol, {
      owner: kind === 'sapper' ? enemy.uid : world.player.uid,
      enemy: kind === 'sapper',
    });
    world.addBullet(bullet);
    for (let frame = 0; frame < 3; frame++) tickBullet(world, bullet, emptyInput());
    expect([bullet.x, bullet.y]).toEqual([6.3, 6.3]);
    expect(bullet.dead).toBe(false);
  });

test('seeker-mine double scattering has its own display writes before arming', () => {
  const { world } = setup();
  world.player.x = world.player.y = 200;
  const bullet = shot(world, 'seekerMine', 2178, { enemy: true, scatter: 4 });
  world.addBullet(bullet);
  for (let frame = 0; frame < 3; frame++) tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([12.6, 12.6]);
  expect(bullet.mineState!.armed).toBe(false);
  expect(bullet.scatter).toBe(1);
});

test('turret damping reads its displayed preceding distance while retaining Number motion', () => {
  const { world } = setup();
  const bullet = shot(world, 'turret', 2444, {
    enemy: true,
    speed: 10,
    origin: { x: 0, y: 0 },
    build: 1,
  });
  world.addBullet(bullet, world.player);
  tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([7.05, 7.05]);
  tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y]).toEqual([13.75, 13.75]);
  expect(bullet.motion!.x).toBeCloseTo(6.718567811865475, 12);
});
