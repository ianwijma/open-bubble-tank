import { expect, test } from 'bun:test';
import { direction } from '../src/game/core/math';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

function setup() {
  const world = new World([], [], 18);
  world.hitTest = world.hitProjectile = () => false;
  world.player.life = world.player.maxLife = 100;
  return world;
}
function enemy(world: World, x: number, y = 0) {
  const tank = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0, parts: [STARTER.parts[0]] },
    'enemy',
    x,
    y,
  );
  world.field.enemies.push(tank);
  return tank;
}
function shot(world: World, changes: Partial<Projectile> = {}) {
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'orbital',
    symbol: 2016,
    x: 0,
    y: 0,
    angle: 90,
    speed: 3,
    damage: 7,
    ...changes,
  });
  world.addBullet(bullet);
  return bullet;
}
const tick = (world: World, bullet: Projectile) => tickBullet(world, bullet, emptyInput());
const effects = (world: World) => world.runtimeFor(world.field).effectQueue;

test('orbital Setup with no target retains rotation but initializes horizontal movement', () => {
  const world = setup(),
    b = shot(world, { angle: 123 });
  expect(b.angle).toBe(123);
  expect(b.motion).toEqual({ x: 3, y: 0 });
  tick(world, b);
  const radial = direction(128 - 90, world.player.radius + 10);
  expect(b.angle).toBe(128);
  expect(b.x).toBeCloseTo(radial.x + 3);
  expect(b.y).toBeCloseTo(radial.y);
  expect(b.motion).toEqual({ x: 3, y: 0 });
});

test('distant orbital keeps movement below15 degrees, but updates it at the inclusive turn threshold', () => {
  const world = setup(),
    aligned = shot(world, { x: 100, angle: 170 });
  tick(world, aligned);
  expect([aligned.angle, aligned.x, aligned.y]).toEqual([170, 103, 0]);
  const turning = shot(world, { x: 100, angle: 165 });
  tick(world, turning);
  expect(turning.angle).toBeCloseTo(165.75);
  expect(turning.x).toBeCloseTo(100 + direction(165.75, 3).x);
  expect(turning.y).toBeCloseTo(direction(165.75, 3).y);
});

test('orbital acquisition follows the orbit placement, uses strict range and first array order, then aims next frame', () => {
  const world = setup(),
    b = shot(world),
    point = direction(5, world.player.radius + 10);
  const boundary = enemy(world, point.x, point.y),
    selected = enemy(world, point.x, point.y),
    closer = enemy(world, point.x, point.y);
  boundary.x += 100 + boundary.radius;
  selected.x += 99 + selected.radius;
  closer.x += 10;
  tick(world, b);
  expect(b.targetId).toBe(selected.uid);
  expect(b.homing!.target).toBe(selected);
  expect(b.angle).toBe(95);
  const angle = (Math.atan2(selected.y - b.y, selected.x - b.x) * 180) / Math.PI;
  tick(world, b);
  expect(b.angle).toBeCloseTo(angle);
  expect(b.homing!.target).not.toBe(closer);
});

test('enemy seekers and orbitals steer toward rotated authored hit locations, not tank centers', () => {
  for (const orbital of [false, true]) {
    const world = setup(),
      target = orbital ? enemy(world, 100) : world.player;
    target.x = 100;
    target.design = { ...target.design, parts: [{ ...STARTER.parts[0], x: 30 }] };
    target.rotation = 90;
    const b = shot(world, {
      kind: orbital ? 'orbital' : 'seeker',
      enemy: !orbital,
      targetId: target.uid,
      symbol: orbital ? 2016 : 1809,
    });
    expect(b.angle).toBeCloseTo((Math.atan2(30, 100) * 180) / Math.PI);
    tick(world, b);
    expect(b.x).toBeCloseTo(direction(b.angle, b.speed).x);
    expect(b.y).toBeCloseTo(direction(b.angle, b.speed).y);
  }
});

test('orbital close latch hits the first candidate even when its aimed target is later in the array', () => {
  const world = setup(),
    first = enemy(world, -200),
    aimed = enemy(world, 4),
    b = shot(world, { targetId: aimed.uid });
  expect(b.homing!.close).toBe(true); // Setup already executes RotateTowardTarget.
  aimed.x = 40;
  tick(world, b);
  expect(b.dead).toBe(true);
  expect([first.life, aimed.life]).toEqual([93, 100]);
  expect(b.hit.size).toBe(0);
  expect(b.missExempt).toBeUndefined();
  expect(world.stats.damageDone).toBe(0);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1767]);
});

test('enemy seeker close latch uses strict5px and survives later steering away from the avatar', () => {
  for (const x of [4.99, 5]) {
    const world = setup();
    world.player.x = x;
    const b = shot(world, {
      kind: 'seeker',
      symbol: 1809,
      enemy: true,
      targetId: world.player.uid,
    });
    world.player.x = 100;
    tick(world, b);
    expect(b.dead).toBe(x < 5);
    expect(world.player.life).toBe(x < 5 ? 93 : 100);
  }
});

test('orbital interception samples retained movement before tank contact and leaves the intercepting shot intact', () => {
  const world = setup(),
    b = shot(world),
    opposite = shot(world, { kind: 'shell', symbol: 1717, enemy: true });
  opposite.dead = true; // Still in arrBullets until the field flushes its removal queue.
  const point = direction(5, world.player.radius + 10),
    calls: number[][] = [];
  world.hitProjectile = (target, x, y) => {
    expect(target).toBe(opposite);
    calls.push([x, y]);
    return Math.abs(x - (point.x + 1.5)) < 0.001;
  };
  world.hitTest = () => {
    throw new Error('shot interception must precede tank tests');
  };
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(calls).toHaveLength(3);
  for (const [i, offset] of [0, -1.5, 1.5].entries()) {
    expect(calls[i][0]).toBeCloseTo(point.x + offset);
    expect(calls[i][1]).toBeCloseTo(point.y);
  }
  expect(world.bullets).toContain(opposite);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1767]);
});

test('owner detachment wipes orbitals before wall reporting; a dead but attached owner remains valid', () => {
  const world = setup(),
    b = shot(world);
  world.player.dead = true;
  tick(world, b);
  expect(b.dead).toBe(false);
  world.player = createTank(world.nextId(), STARTER, 'player');
  b.x = 1000;
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(world.stats.friendlyMissed).toBe(0);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1767]);
});

test('a lethal owner callback leaves its orbital attached until queued enemy removal', () => {
  const world = setup(),
    home = enemy(world, 0),
    b = shot(world, { owner: home.uid, enemy: true, symbol: 1807 });
  world.player.x = 300;
  world.kill(home);
  expect(b.dead).toBe(false);
  tick(world, b);
  expect(b.dead).toBe(false);
  world.flushEnemyRemovals();
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1767]);
});

test('enemy seeker refreshes a detached avatar in collision after steering at the previous reference', () => {
  const world = setup(),
    old = world.player;
  old.y = 100;
  const b = shot(world, { kind: 'seeker', symbol: 1809, enemy: true, targetId: old.uid });
  world.player = createTank(world.nextId(), STARTER, 'player', 100, 0, 100, 100);
  tick(world, b);
  expect(b.angle).toBeCloseTo(90);
  expect(b.homing!.target).toBe(world.player);
  tick(world, b);
  expect(b.angle).toBeCloseTo((Math.atan2(-3, 100) * 180) / Math.PI);
});
