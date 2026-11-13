import { setFieldFixtureLayout } from './fixtures/field-layout';
import { importActorFixtures } from './fixtures/actor-attachments';
import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { HomingTargetReadError } from '../src/game/simulation/homing-projectiles';
import { cacheEmptyField } from './fixtures/empty-field';

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
  importActorFixtures(world);
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
  world.actorParents.sync(world);
  world.addBullet(bullet);
  return bullet;
}
const tick = (world: World, bullet: Projectile) => {
  world.actorParents.sync(world);
  tickBullet(world, bullet, emptyInput());
};
const effects = (world: World) => world.runtimeFor(world.field).effectQueue;

test('orbital Setup with no target retains rotation but initializes horizontal movement', () => {
  const world = setup(),
    b = shot(world, { angle: 123 });
  expect(b.angle).toBe(123);
  expect(b.motion).toEqual({ x: 3, y: 0 });
  tick(world, b);
  expect(b.angle).toBe(128);
  expect([b.x, b.y]).toEqual([28.6, 20]); // Separate orbit placement and motion writes.
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
  expect([turning.x, turning.y]).toEqual([97.05, 0.7]);
});

test('orbital acquisition follows the orbit placement, uses strict range and first array order, then aims next frame', () => {
  const world = setup(),
    b = shot(world),
    point = { x: 32.35, y: 2.8 };
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
  tick(world, b);
  expect(b.angle).toBe(0); // Both stored y values are2.8 after Point/display conversion.
  expect(b.homing!.target).not.toBe(closer);
});

test('enemy seekers and orbitals steer toward rotated authored hit locations, not tank centers', () => {
  for (const orbital of [false, true]) {
    const world = setup(),
      target = orbital ? enemy(world, 100) : world.player;
    target.x = 100;
    target.design = { ...target.design, parts: [{ ...STARTER.parts[0], x: 30 }] };
    target.rotation = 90;
    setFieldFixtureLayout(world);
    const b = shot(world, {
      kind: orbital ? 'orbital' : 'seeker',
      enemy: !orbital,
      targetId: target.uid,
      symbol: orbital ? 2016 : 1809,
    });
    expect(b.angle).toBeCloseTo((Math.atan2(30, 100) * 180) / Math.PI);
    tick(world, b);
    expect([b.x, b.y]).toEqual([2.85, 0.85]);
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
    setFieldFixtureLayout(world);
    const b = shot(world, {
      kind: 'seeker',
      symbol: 1809,
      enemy: true,
      targetId: world.player.uid,
    });
    world.player.x = 100;
    setFieldFixtureLayout(world);
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
  const point = { x: 32.35, y: 2.8 },
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
  world.fieldDisplays.updateAvatar(
    world.player,
    world.currentWrapper,
    world.transit?.next,
    world.stats.frames,
  );
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
  setFieldFixtureLayout(world);
  world.kill(home);
  expect(b.dead).toBe(false);
  tick(world, b);
  expect(b.dead).toBe(false);
  world.flushEnemyRemovals();
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1767]);
});

test('base Run refreshes collision avatar before Move while steering keeps the detached target reference', () => {
  const world = setup(),
    old = world.player;
  const b = shot(world, {
    kind: 'seeker',
    symbol: 1809,
    enemy: true,
    targetId: old.uid,
    x: 200,
    y: 100,
  });
  world.player = createTank(world.nextId(), STARTER, 'player', 0, 0, 100, 100);
  world.fieldDisplays.updateAvatar(
    world.player,
    world.currentWrapper,
    world.transit?.next,
    world.stats.frames,
  );
  tick(world, b);
  expect(b.homing!.avatar).toBe(world.player);
  expect(b.homing!.target).toBe(old);
  // Detached Avatar.localToGlobal(hitPoint) is at its own origin, rather
  // than the new avatar's centered game root. The projectile starts at475,325 globally.
  expect(b.angle).toBe((360 * Math.atan2(-325, -475)) / (2 * Math.PI));
  let receiver: unknown;
  world.hitTest = (tank) => {
    receiver = tank;
    return true;
  };
  tick(world, b);
  expect(receiver).toBe(world.player);
  expect(world.player.life).toBe(93);
  expect(old.life).toBe(100);
  expect(b.homing!.target).toBe(old);
});

test('explicit home and target references survive same-UID replacements and a cached home parent', () => {
  const world = setup(),
    home = enemy(world, 0),
    target = enemy(world, 200),
    b = createProjectile(world.nextId(), {
      owner: home.uid,
      enemy: false,
      kind: 'orbital',
      symbol: 2016,
      x: 0.08,
      y: -0.08,
      angle: 270,
      speed: 3,
      damage: 7,
    });
  world.actorParents.sync(world);
  world.addBullet(b, home, target);
  expect([b.x, b.y]).toEqual([0.05, -0.05]);
  expect(b.homing!.home).toBe(home);
  expect(b.homing!.target).toBe(target);
  world.actorParents.detach(home);
  world.actorParents.detach(target);
  world.field.enemies = [{ ...home }, { ...target, y: 200 }];
  importActorFixtures(world);
  world.actorParents.sync(world);
  // Detached target no longer gates orbital pursuit; detached home removes it.
  tick(world, b);
  expect(b.homing!.home).toBe(home);
  expect(b.homing!.target).toBe(target);
  expect(b.dead).toBe(true);

  const cached = setup(),
    cachedHome = enemy(cached, 0),
    old = cached.field,
    retained = shot(cached, { owner: cachedHome.uid });
  cached.rng.next = () => 0.5;
  cacheEmptyField(cached);
  cached.player.life = 99; // Keep interface progression from opening an upgrade prompt.
  cached.player.x = 425;
  setFieldFixtureLayout(cached);
  cached.jump({ x: 1, y: 0 });
  cached.transit!.next.enemies = [];
  cached.transit!.offset = { x: 800, y: 0 };
  setFieldFixtureLayout(cached);
  cached.transit!.target = { x: 483, y: 0 };
  cached.player.x = 483;
  setFieldFixtureLayout(cached);
  cached.step(emptyInput());
  expect(cached.field).not.toBe(old);
  expect(cached.actorParents.hasParent(cachedHome)).toBe(true);
  expect(cached.actorParents.onStage(cachedHome)).toBe(false);
  tick(cached, retained);
  expect(retained.dead).toBe(false);
});

test('homing Run waits during pause and source target-read errors end only the current frame', () => {
  const world = setup(),
    b = shot(world);
  world.player.life = 99;
  const position = { x: b.x, y: b.y, angle: b.angle };
  world.mode = 'paused';
  world.step(emptyInput());
  expect({ x: b.x, y: b.y, angle: b.angle }).toEqual(position);
  world.mode = 'playing';
  const orphan = enemy(world, 200);
  const parent = world.actorParents.hasParent;
  world.actorParents.hasParent = (tank) => (tank === orphan ? false : parent(tank));
  expect(() => tick(world, b)).toThrow(HomingTargetReadError);
  expect(() => world.step(emptyInput())).not.toThrow();
  world.field.enemies = [];
  world.actorParents.hasParent = parent;
  const calls: string[] = [];
  world.hitTest = () => {
    calls.push('host');
    throw new Error('host failure');
  };
  enemy(world, 200);
  expect(() => world.step(emptyInput())).toThrow('host failure');
  expect(calls).toEqual(['host']);
});
