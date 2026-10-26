import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { STARTER } from '../src/game/data/catalog';
import { projectileFlags } from '../src/game/simulation/projectile-flags';
import { tickGuns } from '../src/game/simulation/weapons';
import { projectileTankCallback } from '../src/game/simulation/projectile-contact';
import { tickPickups } from '../src/game/simulation/pickups';
import type { Projectile } from '../src/game/core/types';
function setup() {
  const world = new World([], [], 10);
  world.hitTest = () => false;
  const target = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0 },
    'enemy',
    100,
    0,
  );
  world.field.enemies = [target];
  return { world, target };
}
function bullet(world: World, values: Partial<Projectile> = {}): Projectile {
  return {
    uid: world.nextId(),
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    x: 0,
    y: 0,
    angle: 0,
    heading: 0,
    speed: 10,
    damage: 2,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: null,
    hit: new Set(),
    dead: false,
    symbol: 1721,
    orbit: 0,
    ...values,
  };
}
const tick = (world: World, b: Projectile) => tickBullet(world, b, emptyInput());
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;

test('ordinary movement precedes the next frame wall expiry; ricochet reflects and moves on its bounce frame', () => {
  const { world } = setup(),
    b = bullet(world, { x: 414 });
  tick(world, b);
  expect([b.x, b.dead, queue(world).length]).toEqual([424, false, 0]);
  tick(world, b);
  expect([b.x, b.dead, queue(world)[0].x]).toEqual([424, true, 424]);
  const ricochet = bullet(world, { kind: 'ricochet', symbol: 1946, x: 416 });
  tick(world, ricochet);
  expect(ricochet.x).toBeCloseTo(406);
  expect(ricochet.bounces).toBe(1);
  ricochet.x = 416;
  ricochet.angle = 0;
  ricochet.bounces = 6;
  tick(world, ricochet);
  expect(ricochet.dead).toBe(true);
  expect(ricochet.x).toBe(416);
});

test('ordinary contacts sample before movement and callbacks retain the contact position', () => {
  const { world, target } = setup(),
    b = bullet(world);
  target.x = 10;
  world.hitTest = (t, x, y) => t === target && Math.abs(x - 10) < 0.01 && Math.abs(y) < 0.01;
  tick(world, b);
  expect(target.life).toBe(100);
  expect(b.x).toBe(10);
  tick(world, b);
  expect(target.life).toBe(98);
  expect(b.dead).toBe(true);
  expect(b.x).toBe(10);
  expect(queue(world).map((e) => [e.symbol, e.x])).toEqual([[1723, 10]]);
});

test('friendly half-step contact needs a current-point layer hit; ordinary enemy shots require an enemy wrapper entry', () => {
  const { world, target } = setup(),
    b = bullet(world, { x: 10, speed: 20 });
  target.x = 0;
  world.hitTest = (t, x) => Math.abs(x - t.x) < 0.01;
  tick(world, b);
  expect(target.life).toBe(100); // Backward point alone cannot open the layer gate.
  const blocker = createTank(world.nextId(), { ...target.design }, 'enemy', 10, 0);
  world.field.enemies.push(blocker);
  b.x = 10;
  tick(world, b);
  expect(target.life).toBe(98);
  expect(blocker.life).toBe(100);
  world.field.enemies = [];
  const enemyShot = bullet(world, { enemy: true, speed: 0 });
  world.player.life = 40;
  tick(world, enemyShot);
  expect(world.player.life).toBe(40);
  world.field.enemies = [target];
  tick(world, enemyShot);
  expect(world.player.life).toBe(38);
});

test('Massive Cannon samples its authored width and advances after a hit, skipping previously hit tanks', () => {
  const { world, target } = setup(),
    b = bullet(world, { kind: 'pierce', symbol: 1794, speed: 7 });
  target.x = 40;
  world.projectileWidth = () => 80;
  world.hitTest = (t, x, y) => t === target && Math.abs(x - 40) < 0.01 && Math.abs(y) < 0.01;
  tick(world, b);
  expect(target.life).toBe(98);
  expect(b.x).toBe(7);
  expect(b.dead).toBe(false);
  b.x = 0;
  tick(world, b);
  expect(target.life).toBe(98);
  expect(b.x).toBe(7);
  target.guns = [
    { part: { ...STARTER.parts[1], type: 4013 }, counter: 0, angle: 0, burst: 0, burstTimer: 0 },
  ];
  world.hitPart = () => true;
  let released = 0;
  world.releaseCarrier = () => {
    released++;
  };
  b.x = 0;
  tick(world, b);
  expect(released).toBe(0); // _-dp checks its prior-hit list before carrier interception.
});

test('splash callback runs before direct damage and excludes only the current contact, not previous piercing hits', () => {
  const { world, target } = setup(),
    other = createTank(world.nextId(), target.design, 'enemy', 110, 0);
  world.field.enemies.push(other);
  const b = bullet(world, { kind: 'pierce', symbol: 1728, x: 100, explode: 75, splashDamage: 100 });
  b.hit.add(other.uid);
  const calls: number[] = [];
  world.damage = (tank) => {
    calls.push(tank.uid);
  };
  projectileTankCallback(world, b, target);
  expect(calls).toEqual([other.uid, target.uid]);
});

test('source flags distinguish flak targets from area-cleanup targets and do not emit destroyed-shot callbacks', () => {
  const { world } = setup(),
    symbols = [1809, 1807, 2016, 1831, 15, 1827, 2178];
  const shots = symbols.map((symbol) => bullet(world, { symbol, enemy: true, x: 5 }));
  world.bullets.push(...shots);
  expect(shots.map((b) => [projectileFlags(b).seeker, projectileFlags(b).destroyable])).toEqual([
    [true, true],
    [true, true],
    [true, true],
    [false, true],
    [true, false],
    [false, false],
    [false, false],
  ]);
  world.explode(bullet(world), 60, 2);
  expect(world.bullets.map((b) => b.symbol)).toEqual([15, 1827, 2178]);
  expect(queue(world)).toEqual([]);
});

test('Buster changes only the first nearby enemy shot to inert state2; state2 wall check follows movement', () => {
  const { world } = setup(),
    buster = bullet(world, { kind: 'buster', symbol: 1800 });
  const first = bullet(world, { kind: 'seeker', symbol: 1809, enemy: true, x: 5 }),
    second = bullet(world, { enemy: true, x: 6 });
  world.bullets.push(buster, first, second);
  world.hitTest = () => true;
  world.player.life = 40;
  tick(world, buster);
  expect(first.deflected).toEqual({ x: 10, y: 0 });
  expect(second.deflected).toBeUndefined();
  expect(first.dead).toBe(false);
  expect(buster.x).toBe(10);
  tick(world, first);
  expect(first.x).toBe(15);
  expect(world.player.life).toBe(40);
  first.x = 410;
  tick(world, first);
  expect(first.x).toBe(420);
  expect(first.dead).toBe(true);
});

test('Leech creates an attracted avatar pickup before shield-blocked damage; it never heals the firing ally directly', () => {
  const { world, target } = setup(),
    owner = createTank(
      world.nextId(),
      { ...STARTER, avatar: false, life: 100 },
      'ally',
      0,
      0,
      100,
      10,
    );
  world.allies.push(owner);
  target.shield = 10;
  const b = bullet(world, { kind: 'leech', symbol: 1813, owner: owner.uid, x: 100, speed: 0 });
  world.hitTest = (t) => t === target;
  tick(world, b);
  expect(target.life).toBe(100);
  expect(owner.life).toBe(10);
  expect(world.player.life).toBe(1);
  expect(world.pickups.map((p) => [p.value, p.forced, p.x])).toEqual([[1, true, 100]]);
  world.hitTest = () => false;
  for (let i = 0; i < 12; i++) tickPickups(world);
  expect(world.player.life).toBe(2);
  expect(world.stats.collected).toBe(1);
  expect(world.pickups).toEqual([]);
});

test('friendly seekers/infection ignore shots, Sappers ignore enemy shots, and armed mines preserve incoming shells', () => {
  for (const [kind, symbol] of [
    ['seeker', 1827],
    ['infect', 15],
  ] as const) {
    const { world, target } = setup(),
      b = bullet(world, { kind, symbol, targetId: target.uid });
    const opposite = bullet(world, { enemy: true, speed: 0 });
    world.bullets.push(b, opposite);
    world.hitProjectile = () => true;
    tick(world, b);
    expect(b.dead).toBe(false);
  }
  {
    const { world, target } = setup();
    world.player.x = 200;
    const sapper = bullet(world, { kind: 'sapper', symbol: 1831, owner: target.uid, enemy: true });
    const enemyShot = bullet(world, { enemy: true, speed: 0 });
    world.bullets.push(sapper, enemyShot);
    world.hitProjectile = () => true;
    tick(world, sapper);
    expect(sapper.dead).toBe(false);
  }
  const { world } = setup();
  world.player.x = 100;
  const mine = bullet(world, {
    kind: 'seekerMine',
    symbol: 2178,
    enemy: true,
    detonating: 1,
    speed: 0,
  });
  const incoming = bullet(world, { speed: 0 });
  world.bullets.push(mine, incoming);
  world.hitProjectile = () => true;
  tick(world, mine);
  expect(mine.dead).toBe(true);
  expect(incoming.dead).toBe(false);
  expect(queue(world).map((e) => e.symbol)).toEqual([1834, 1723]);
});

test('the shipped infection acquisition bug expires at setup and first Run rather than inventing a nearest target', () => {
  const { world, target } = setup();
  world.hitTest = () => false;
  world.player = createTank(
    world.nextId(),
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 3013 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  const b = world.bullets[0],
    start = { x: b.x, y: b.y };
  expect(b.targetId).toBeNull();
  expect(b.removeAfterFrame).toBe(true);
  expect(b.infectionTries).toBe(2);
  expect(queue(world).map((e) => [e.symbol, e.randomRotation])).toEqual([[1767, false]]);
  world.step(emptyInput());
  expect(world.bullets).toEqual([]);
  expect(target.status.infect).toBe(0);
  expect(b.x).toBeCloseTo(start.x + 6);
  expect(b.y).toBeCloseTo(start.y);
  expect(world.effects.map((e) => [e.symbol, e.rotation])).toEqual([
    [1767, 0],
    [1767, 0],
  ]);
});

test('flak acquires source Seeker flags rather than sapper/friendly-seeker kinds', () => {
  const { world } = setup();
  const tank = createTank(
    world.nextId(),
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5004 }] },
    'player',
    0,
    0,
    50,
    1,
  );
  world.player = tank;
  world.bullets.push(
    bullet(world, { kind: 'sapper', symbol: 1831, x: 10 }),
    bullet(world, { kind: 'seeker', symbol: 1827, x: 20 }),
    bullet(world, { kind: 'infect', symbol: 15, x: 30 }),
  );
  tickGuns(world, tank, emptyInput());
  expect(tank.guns[0].autoTargetId).toBe(world.bullets[2].uid);
});
