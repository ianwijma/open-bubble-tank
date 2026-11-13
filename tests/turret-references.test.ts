import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { FieldVisit } from '../src/game/core/field-visit';
import { tickTurretBehavior } from '../src/game/simulation/turrets';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { shieldTurretCaller } from './fixtures/shield-turret-caller';
import { cacheEmptyField } from './fixtures/empty-field';

function setup() {
  const world = new World([], [], 23);
  const design = shieldTurretCaller();
  const owner = createTank(world.nextId(), design, 'enemy', 100, 0, undefined, undefined, world);
  const gun = owner.guns.find((gun) => gun.part.type === 4032)!;
  gun.part = { ...gun.part, x: 0, y: 0, rotation: 0, scale: 1 };
  gun.angle = 0;
  gun.counter = -1000;
  owner.rotation = 0;
  owner.movement.stationary = true;
  world.field.enemies = [owner];
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.actorParents.sync(world);
  world.hitTest = () => false;
  world.rng.next = () => 0.5;
  return { world, owner, gun };
}

function cachedOwner() {
  const state = setup(),
    { world, owner, gun } = state;
  const original = world.field,
    runtime = world.runtimeFor(original);
  world.fireGun(owner, gun, emptyInput());
  const turret = gun.turretRefs![0];
  turret.x = 20;
  turret.y = 30;
  turret.stopped = true;
  turret.build = 4;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  // The detached layer keeps this local translation and loses the stage ancestors.
  const detachedPoint = { x: turret.x - world.player.x, y: turret.y - world.player.y };
  world.step(emptyInput());
  expect(world.transit).toBeNull();
  world.jump({ x: -1, y: 0 });
  world.actorParents.sync(world);
  return { ...state, original, runtime, turret, detachedPoint };
}

test('cached turret owner keeps old-layer shielding but its avatar target aborts the listener', () => {
  const { world, owner, gun, turret, runtime } = cachedOwner();
  expect(runtime.bullets).toContain(turret);
  expect(world.bullets).not.toContain(turret);
  expect(world.hasBulletParent(turret)).toBe(true);
  expect(gun.turretTarget === world.player).toBe(true);
  expect(() => tickTurretBehavior(world, owner, gun)).toThrow(/inner_mc/);
  expect(owner.shield).toBe(1);
  gun.counter = 79;
  world.hitSoundTimer = 6;
  const art = owner.artAge;
  world.step(emptyInput());
  expect([gun.counter, world.hitSoundTimer]).toEqual([79, 6]);
  expect(owner.artAge).toBe(art + 1);
});

test('direct retained turret aiming converts its actual detached layer separately from the mount', () => {
  const { world, owner, gun, turret, detachedPoint } = cachedOwner();
  // Controlled public movTarget assignment, distinct from the cached avatar reset above.
  turret.build = 1;
  gun.turretTarget = turret;
  const mount = world.actorParents.localToGlobal(owner, gun.part);
  const expected =
    (360 * Math.atan2(detachedPoint.y - mount.y, detachedPoint.x - mount.x)) / (2 * Math.PI);
  tickTurretBehavior(world, owner, gun);
  expect(gun.turretTarget === turret).toBe(true);
  expect(gun.angle).toBeCloseTo(expected, 10);
});

test('turret home parentage survives collection changes and ends on actual removal', () => {
  const { world, owner, turret } = cachedOwner();
  expect(turret.turretHome === owner).toBe(true);
  expect(world.field.enemies.includes(owner)).toBe(false);
  // Controlled MoveBullet callback: this does not imply a detached wrapper receives Run.
  tickBullet(world, turret, emptyInput());
  expect(turret.dead).toBe(false);
  world.actorParents.detach(owner);
  tickBullet(world, turret, emptyInput());
  expect(turret.dead).toBe(true);
});

test('a turret spawned without a home does not acquire one by matching a live actor ID', () => {
  const { world, owner } = setup();
  const turret = createProjectile(world.nextId(), {
    kind: 'turret',
    symbol: 2444,
    owner: owner.uid,
    enemy: true,
    x: 100,
    y: 0,
    angle: 0,
    speed: 10,
    damage: 0,
    health: 10,
  });
  expect(world.addBullet(turret)).toBe(true);
  expect(turret.turretHome === undefined).toBe(true);
  tickBullet(world, turret, emptyInput());
  expect(turret.dead).toBe(true);
});

test('no-target aim consumes Scale(-random) and preserves its signed-zero heading', () => {
  const { world, owner, gun } = setup();
  owner.x = owner.y = 0;
  world.actorParents.sync(world);
  let draws = 0;
  world.rng.next = () => {
    draws++;
    return 0;
  };
  tickTurretBehavior(world, owner, gun);
  expect(draws).toBe(1);
  expect(gun.angle).toBe(-180);
});

test('turret trigger retains the existing rotation and does not poll a completed target', () => {
  const { world, owner, gun } = setup();
  owner.rotation = 20;
  gun.angle = 37;
  world.fireGun(owner, gun, emptyInput());
  const first = world.bullets[0];
  expect([gun.angle, first.angle]).toEqual([37, 57]);
  expect(gun.turretTarget === first).toBe(true);
  first.build = 4;
  gun.angle = -61;
  world.fireGun(owner, gun, emptyInput());
  expect(world.bullets.at(-1)!.kind).toBe('builder');
  expect([gun.angle, world.bullets.at(-1)!.angle]).toEqual([-61, -41]);
});

test('rejected turret birth retains an unparented constructor object without Setup pose or home', () => {
  const { world, owner, gun } = setup();
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const shots = world.stats.enemyShots;
  world.fireGun(owner, gun, emptyInput());
  const returned = gun.turretRefs![0];
  expect(world.bullets).toEqual([]);
  expect(world.stats.enemyShots).toBe(shots);
  expect(world.hasBulletParent(returned)).toBe(false);
  expect([returned.x, returned.y, returned.angle]).toEqual([0, 0, 0]);
  expect(Number.isNaN(returned.speed)).toBe(true);
  expect([returned.damage, returned.enemy, returned.turretHome]).toEqual([1, false, undefined]);
  expect(gun.turretTarget === returned).toBe(true);
  tickTurretBehavior(world, owner, gun);
  expect(gun.turretTarget).toBeNull();
  expect(gun.turretRefs).toEqual([]);
});
