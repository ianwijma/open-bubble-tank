import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { projectileFlags } from '../src/game/simulation/projectile-flags';
import { tankHitLocation } from '../src/game/simulation/hit-location';
import { tickGuns } from '../src/game/simulation/weapons';
import type { Projectile } from '../src/game/core/types';

function setup() {
  const world = new World([], [], 3);
  world.hitTest = () => false;
  world.hitProjectile = () => false;
  const enemy = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0 },
    'enemy',
    100,
    0,
  );
  enemy.guns = [];
  world.field.enemies = [enemy];
  const shot = (changes: Partial<Projectile> = {}) =>
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1721,
      x: 0,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
      ...changes,
    });
  return { world, enemy, shot };
}
const tick = (world: World, b: Projectile) => tickBullet(world, b, emptyInput());
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;

test('Starburst spawns at its mounted registration rather than the unused preview emitter', () => {
  const { world } = setup();
  world.player.x = 30;
  world.player.y = 40;
  world.player.rotation = 90;
  const gun = {
    part: { ...STARTER.parts[1], type: 3005, x: 10, y: 5 },
    counter: -1,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  world.fireGun(world.player, gun, emptyInput());
  expect(world.bullets[0].x).toBeCloseTo(25);
  expect(world.bullets[0].y).toBeCloseTo(50);
});

test('Starburst contact on the split Run wins over the exhausted fuse', () => {
  const { world, enemy, shot } = setup();
  const b = shot({ kind: 'star', symbol: 1811, damage: 35 });
  for (let i = 0; i < 45; i++) tick(world, b);
  world.hitTest = (t) => t === enemy;
  tick(world, b);
  expect(enemy.life).toBe(65);
  expect(b.dead).toBe(true);
  expect(world.bullets).toHaveLength(0);
  expect(queue(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('Starburst fuse counts subtype movement updates and fresh fragments retain no parent state', () => {
  const { world, shot } = setup();
  const b = shot({
    kind: 'star',
    symbol: 1811,
    angle: 20,
    status: 'infect',
    explode: 70,
    artScale: 1.7,
  });
  b.deflected = { x: 0, y: 0 };
  for (let i = 0; i < 100; i++) tick(world, b);
  delete b.deflected;
  for (let i = 0; i < 45; i++) tick(world, b);
  expect(world.bullets).toHaveLength(0);
  tick(world, b);
  expect(world.bullets).toHaveLength(36);
  expect(world.bullets.map((b) => b.angle)).toEqual(
    Array.from({ length: 36 }, (_, i) => 20 + i * 10),
  );
  for (const fragment of world.bullets) {
    expect([
      fragment.kind,
      fragment.symbol,
      fragment.damage,
      fragment.speed,
      fragment.life,
    ]).toEqual(['shell', 1721, 5, 7, Infinity]);
    expect([fragment.status, fragment.deflected, fragment.anchor, fragment.partType]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect([fragment.explode, fragment.artScale, fragment.heading, fragment.age]).toEqual([
      0,
      1,
      fragment.angle,
      0,
    ]);
  }
});

test('Repulsor needs an enemy-layer pixel gate and respects ordered prior-contact blocking', () => {
  const { world, enemy, shot } = setup();
  const second = createTank(world.nextId(), { ...enemy.design }, 'enemy', 0, 0);
  enemy.x = 0;
  world.field.enemies.push(second);
  const b = shot({ kind: 'push', symbol: 2221, damage: 0, speed: 8 });
  tick(world, b);
  expect(enemy.velocity.x).toBe(0);
  world.hitTest = (t) => t === second;
  tick(world, b);
  expect(enemy.velocity.x).toBeCloseTo(26 * 0.92);
  expect(second.velocity.x).toBe(0);
  tick(world, b);
  expect(second.velocity.x).toBe(0);
  expect(b.x).toBe(24);
  expect(b.dead).toBe(false);
  expect(queue(world)).toHaveLength(0);
});

test('Repulsor includes allied geometry in the gate, truncates its radius gap and calls zero Damage', () => {
  const { world, enemy, shot } = setup();
  const ally = createTank(world.nextId(), STARTER, 'ally');
  world.allies.push(ally);
  world.hitTest = (t) => t === ally;
  enemy.x = enemy.radius + 70;
  const b = shot({ kind: 'push', symbol: 2221, damage: 0 });
  tick(world, b);
  expect(enemy.velocity.x).toBe(0);
  enemy.x = enemy.radius + 69.99;
  let damageCalls = 0;
  world.damage = (target, amount, source) => {
    expect([target, amount, source]).toEqual([enemy, 0, b]);
    damageCalls++;
  };
  tick(world, b);
  expect(damageCalls).toBe(1);
  expect(ally.velocity.x).toBe(0);
  expect(enemy.velocity.x).toBeGreaterThan(0);
});

test('allied geometry can open the ordinary friendly layer gate for an enemy half-step contact', () => {
  const { world, enemy, shot } = setup();
  const ally = createTank(world.nextId(), STARTER, 'ally');
  const b = shot({ speed: 10, damage: 2 });
  world.hitTest = (tank, x) => (tank === ally && x === 0) || (tank === enemy && x === -5);
  tick(world, b);
  expect(enemy.life).toBe(100);
  world.allies.push(ally);
  b.x = 0;
  tick(world, b);
  expect(enemy.life).toBe(98);
  expect(b.dead).toBe(true);
});

test('Repulsor fade freezes under base deflection; fade and wall removal have no impact callback', () => {
  const { world, shot } = setup();
  const b = shot({ kind: 'push', symbol: 2221, speed: 0 });
  tick(world, b);
  expect(b.artAlpha).toBeCloseTo(0.96);
  b.deflected = { x: 0, y: 0 };
  for (let i = 0; i < 100; i++) tick(world, b);
  expect(b.artAlpha).toBeCloseTo(0.96);
  delete b.deflected;
  for (let i = 0; i < 23; i++) tick(world, b);
  expect(b.dead).toBe(false);
  tick(world, b);
  expect(b.dead).toBe(true);
  const outside = shot({ kind: 'push', symbol: 2221, x: 416 });
  tick(world, outside);
  expect(outside.dead).toBe(true);
  expect(queue(world)).toHaveLength(0);
});

test('Converter uses homing flags, excludes even armed seeker mines and resets all shot state', () => {
  const { world, enemy, shot } = setup();
  const candidates = [1809, 1807, 1831, 15].map((symbol) =>
    shot({
      enemy: true,
      symbol,
      kind: 'shell',
      owner: enemy.uid,
      status: 'infect',
      explode: 50,
      artScale: 4,
      deflected: { x: 2, y: 3 },
      returning: true,
      age: 200,
      hit: new Set([enemy.uid]),
    }),
  );
  const excluded = [
    shot({ enemy: true, symbol: 2178, kind: 'seekerMine', detonating: 1 }),
    shot({ enemy: true, symbol: 1717 }),
    shot({ symbol: 1827, kind: 'seeker' }),
  ];
  world.bullets.push(...candidates, ...excluded);
  const gun = {
    part: { ...STARTER.parts[1], type: 3006 },
    counter: -1,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  world.fireGun(world.player, gun, emptyInput());
  expect(world.bullets).toHaveLength(7);
  expect(candidates.every((b) => b.dead)).toBe(true);
  expect(excluded.every((b) => world.bullets.includes(b))).toBe(true);
  const converted = world.bullets.filter((b) => !excluded.includes(b));
  for (const b of converted) {
    expect([b.enemy, b.kind, b.symbol, b.speed, b.damage, b.life]).toEqual([
      false,
      'seeker',
      1827,
      10,
      15,
      Infinity,
    ]);
    expect([b.age, b.artScale, b.explode, b.hit.size]).toEqual([0, 1, 0, 0]);
    expect([b.status, b.deflected, b.returning, b.anchor]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(projectileFlags(b)).toMatchObject({
      destroyable: false,
      seeker: false,
      beam: true,
      rotatesTowardTarget: true,
    });
  }
  expect(queue(world).map((effect) => effect.symbol)).toEqual([1735]);
});

test('conversion target selection excludes the last entry; detached avatar-seeker targets retarget first', () => {
  const { world, enemy, shot } = setup();
  const middle = createTank(world.nextId(), enemy.design, 'enemy', 0, 100);
  const last = createTank(world.nextId(), enemy.design, 'enemy', 1, 0);
  world.field.enemies.push(middle, last);
  world.rng.next = () => 0.999;
  world.bullets.push(shot({ enemy: true, symbol: 1809 }));
  const gun = {
    part: { ...STARTER.parts[1], type: 3006 },
    counter: -1,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  world.fireGun(world.player, gun, emptyInput());
  const b = world.bullets[0];
  expect(b.targetId).toBe(middle.uid);
  expect(b.angle).toBeCloseTo(90);
  world.field.enemies = [enemy, last];
  tick(world, b);
  expect(b.targetId).toBe(enemy.uid);
  expect(b.angle).toBeCloseTo(0);
});

test('empty-field conversion queues visual first, then failed replacement Setup, and removes both shots', () => {
  const { world, shot } = setup();
  world.field.enemies = [];
  world.bullets.push(shot({ enemy: true, symbol: 1809 }));
  world.fireGun(
    world.player,
    { part: { ...STARTER.parts[1], type: 3006 }, counter: -1, angle: 0, burst: 0, burstTimer: 0 },
    emptyInput(),
  );
  expect(world.bullets).toHaveLength(0);
  expect(queue(world).map((effect) => effect.symbol)).toEqual([1735, 1767]);
});

test('hit location uses the nearest authored detail, including weapons, first ties and hull rotation', () => {
  const t = createTank(
    1,
    {
      ...STARTER,
      parts: [
        { ...STARTER.parts[0], x: 20, y: 0 },
        { ...STARTER.parts[1], x: 0, y: 5 },
        { ...STARTER.parts[0], x: 0, y: -5 },
      ],
    },
    'player',
    100,
    50,
  );
  t.rotation = 90;
  expect(tankHitLocation(t).x).toBeCloseTo(95);
  expect(tankHitLocation(t).y).toBeCloseTo(50);
});

test('two Sapper mounts each retain one shot and respawn independently after removal', () => {
  const { world, enemy } = setup();
  enemy.guns = [0, 1].map((i) => ({
    part: { ...STARTER.parts[1], type: 4012, key: String(i) },
    counter: 0,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  }));
  for (const gun of enemy.guns) world.fireGun(enemy, gun, emptyInput());
  expect(world.bullets).toHaveLength(2);
  for (const gun of enemy.guns) world.fireGun(enemy, gun, emptyInput());
  expect(world.bullets).toHaveLength(2);
  world.removeBullet(world.bullets[0]);
  for (const gun of enemy.guns) world.fireGun(enemy, gun, emptyInput());
  expect(world.bullets.map((b) => b.anchor)).toEqual([enemy.guns[1], enemy.guns[0]]);
});

test('Spinner weapon retains ordinary aiming rather than its authored fixed mount angle', () => {
  const { world, enemy } = setup();
  world.player.x = enemy.x;
  world.player.y = 100;
  enemy.guns = [
    {
      part: { ...STARTER.parts[1], type: 4019, x: 0, y: 0 },
      counter: 1,
      angle: 0,
      burst: 0,
      burstTimer: 0,
    },
  ];
  tickGuns(world, enemy, emptyInput());
  expect(enemy.guns[0].angle).toBeCloseTo(90);
});
