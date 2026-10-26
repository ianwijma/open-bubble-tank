import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { tickBullet } from '../src/game/simulation/projectiles';
import { MineTimelines } from '../src/game/simulation/mine-timelines';
import { FieldVisit } from '../src/game/core/field-visit';
import type { Projectile } from '../src/game/core/types';
const input = emptyInput();
function setup(...weapons: number[]) {
  const world = new World([], [], 7);
  world.player.x = -200;
  world.player.life = 40;
  world.hitTest = () => false;
  const owner = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      speed: 0,
      parts: [
        STARTER.parts[0],
        ...weapons.map((type, i) => ({ ...STARTER.parts[1], key: `g${i}`, type, x: 0, y: 0 })),
      ],
    },
    'enemy',
    300,
    0,
  );
  world.field.enemies = [owner];
  return { world, owner };
}
function mine(world: World, options: Partial<Projectile> = {}): Projectile {
  const b: Projectile = {
    uid: world.nextId(),
    owner: -1,
    enemy: true,
    kind: 'seekerMine',
    x: 0,
    y: 0,
    angle: 0,
    heading: 0,
    speed: 4,
    damage: 7,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: null,
    hit: new Set(),
    dead: false,
    symbol: 2178,
    orbit: 0,
    ...options,
  };
  world.addBullet(b);
  return b;
}
const tick = (world: World, b: Projectile) => tickBullet(world, b, input);
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;

test('unarmed contact tests only the avatar and uses the stored backward half-step before any scatter', () => {
  const { world } = setup(),
    b = mine(world, { scatter: 3 });
  b.angle = 90;
  world.hitTest = (tank, x, y) => tank === world.player && x === -2 && y === 0;
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(b.scatter).toBe(3);
  expect([b.x, b.y]).toEqual([0, 0]);
  expect(world.player.life).toBe(33);
  expect(queue(world).map((e) => e.symbol)).toEqual([1834]);
});

test('post-scatter proximity arms at the inclusive threshold without homing on the arming Run', () => {
  const { world } = setup(),
    b = mine(world, { scatter: 1 });
  world.player.x = 105.5;
  tick(world, b);
  expect([b.x, b.y, b.scatter]).toEqual([8, 0, 0]);
  expect(b.mineState!.armed).toBe(true);
  expect(b.artFrame).toBe(41);
  expect(b.targetId).toBe(world.player.uid);
  tick(world, b);
  expect(b.x).toBe(12);
});

test('an already armed mine performs both double scatter and the following homing step', () => {
  const { world } = setup(),
    b = mine(world, { angle: 90, scatter: 1, detonating: 1 });
  world.player.x = 100;
  tick(world, b);
  const norm = Math.hypot(100, 8);
  expect(b.x).toBeCloseTo(400 / norm);
  expect(b.y).toBeCloseTo(8 - 32 / norm);
  expect(b.scatter).toBe(0);
  expect(b.mineState!.movement.x).toBeCloseTo(400 / norm);
});

test('allies neither trigger arming nor receive the avatar-only contact', () => {
  const { world } = setup(),
    b = mine(world),
    ally = createTank(world.nextId(), { ...STARTER, avatar: false, life: 50 }, 'ally', 1, 0);
  world.allies.push(ally);
  world.hitTest = (tank) => tank === ally;
  tick(world, b);
  expect(b.mineState!.armed).toBe(false);
  expect(b.dead).toBe(false);
  expect(ally.life).toBe(50);
  world.player.x = 97.5;
  tick(world, b);
  expect(b.mineState!.armed).toBe(true);
  expect(b.x).toBe(0);
});

test('armed interception uses rectangle overlap even when all sampled pixel points miss', () => {
  const { world } = setup(),
    b = mine(world, { detonating: 1 });
  const shot = mine(world, { kind: 'shell', symbol: 1721, enemy: false, x: 1.9, y: 1.9, speed: 0 });
  world.projectileBounds = (shot) => ({ x: shot.x - 1, y: shot.y - 1, width: 2, height: 2 });
  world.hitProjectile = () => false;
  tick(world, b);
  expect(b.dead).toBe(true);
  expect(shot.dead).toBe(false);
  expect(queue(world).map((e) => e.symbol)).toEqual([1834, 1723]);
});

test('empty wrapper guards contact; field completion marks a wipe that the following Run handles', () => {
  const { world } = setup();
  world.field.enemies = [];
  world.fieldVisit = new FieldVisit();
  const b = mine(world, { detonating: 1 });
  world.hitTest = () => false;
  world.step(input);
  expect(b.wipe).toBe(true);
  expect(b.dead).toBe(false);
  expect(world.bullets).toContain(b);
  world.pause();
  const age = b.age;
  world.step(input);
  expect(b.age).toBe(age);
  expect(b.dead).toBe(false);
  world.resume();
  world.step(input);
  expect(world.bullets).not.toContain(b);
  expect(world.effects.map((e) => e.symbol)).toContain(1834);
});

test('wipe precedes wall/contact and regular mines remain stationary without a wall expiry branch', () => {
  const { world } = setup(),
    b = mine(world, { x: 1000, wipe: true });
  world.hitTest = () => true;
  tick(world, b);
  expect(queue(world).map((e) => e.symbol)).toEqual([1834]);
  expect(world.player.life).toBe(40);
  const regular = mine(world, { kind: 'mine', symbol: 1792, x: 1000, speed: 10 });
  world.hitTest = () => false;
  tick(world, regular);
  expect(regular.dead).toBe(false);
  expect(regular.x).toBe(1000);
});

test('idle timelines reroll at frame40, arm at41, stop at55, and continue while simulation is paused', () => {
  const { world } = setup(),
    b = mine(world);
  let calls = 0;
  const clips = new MineTimelines(() => [0.5, 0.9][calls++] ?? 0.9);
  clips.initialize(b);
  expect(b.artFrame).toBe(5);
  for (let i = 0; i < 34; i++) clips.advance(b);
  expect(b.artFrame).toBe(39);
  clips.advance(b);
  expect(b.artFrame).toBe(9);
  expect(calls).toBe(2);
  clips.arm(b);
  expect(b.artFrame).toBe(41);
  for (let i = 0; i < 100; i++) clips.advance(b);
  expect(b.artFrame).toBe(55);
  const paused = mine(world, { x: 30 });
  world.pause();
  const frame = paused.artFrame;
  for (let i = 0; i < 5; i++) world.step(input);
  expect(paused.artFrame).not.toBe(frame);
  expect([paused.x, paused.age]).toEqual([30, 0]);
  const regular = mine(world, { kind: 'mine', symbol: 1792 });
  let starts = 0;
  const ordinaryClips = new MineTimelines(() => {
    starts++;
    return 0.5;
  });
  ordinaryClips.initialize(regular);
  expect(regular.artFrame).toBe(5);
  for (let i = 0; i < 11; i++) ordinaryClips.advance(regular);
  expect(regular.artFrame).toBe(2);
  expect(starts).toBe(1);
});

test('each seeker layer has its own seven-reference cap and its oldest shot skips Run', () => {
  const { world, owner } = setup(4021, 4021);
  for (const gun of owner.guns) for (let i = 0; i < 8; i++) world.fireGun(owner, gun, input);
  expect(world.bullets).toHaveLength(16);
  expect(owner.guns.map((g) => g.mineRefs!.length)).toEqual([7, 7]);
  const oldest = world.bullets.filter((b) => b.readyForDelete);
  expect(oldest).toHaveLength(2);
  world.step(input);
  expect(world.bullets).toHaveLength(14);
  expect(oldest.every((b) => b.age === 0 && b.dead)).toBe(true);
});

test('removed seeker refs remain stale and their current coordinates are used when the cap expires them', () => {
  const { world, owner } = setup(4021),
    gun = owner.guns[0];
  world.fireGun(owner, gun, input);
  const stale = world.bullets[0];
  stale.x = 123;
  world.removeBullet(stale);
  expect(gun.mineRefs).toHaveLength(1);
  for (let i = 0; i < 7; i++) world.fireGun(owner, gun, input);
  expect(world.bullets).toHaveLength(7);
  expect(stale.readyForDelete).toBe(true);
  expect(queue(world).at(-1)!.x).toBe(123);
  expect(gun.mineRefs).not.toContain(stale);
});

test('ordinary layer wrappers clean up on removal, retain spawn coordinates for cap effects, and use ally artwork', () => {
  const { world, owner } = setup(4009),
    gun = owner.guns[0];
  world.fireGun(owner, gun, input);
  world.removeBullet(world.bullets[0]);
  expect(gun.mineRefs).toHaveLength(0);
  for (let i = 0; i < 8; i++) {
    world.fireGun(owner, gun, input);
    if (i === 0) world.bullets[0].x = 123;
  }
  const first = world.bullets[0];
  expect(first.readyForDelete).toBe(true);
  expect(queue(world).at(-1)!.x).not.toBe(123);
  const ally = createTank(world.nextId(), owner.design, 'ally', 0, 200);
  world.fireGun(ally, ally.guns[0], input);
  const shot = world.bullets.at(-1)!;
  expect(shot.symbol).toBe(2182);
  expect(shot.speed).toBe(10);
  const pos = { x: shot.x, y: shot.y };
  tick(world, shot);
  expect([shot.x, shot.y]).toEqual([pos.x, pos.y]);
});

test('death mines start at the tank center with independent scatter and never enter the layer cap', () => {
  const { world, owner } = setup(4022);
  owner.guns[0].part = { ...owner.guns[0].part, x: 80, y: 50 };
  world.kill(owner);
  expect(world.bullets).toHaveLength(6);
  expect(
    world.bullets.every(
      (b) =>
        b.x === owner.x &&
        b.y === owner.y &&
        b.speed === 4 &&
        b.damage === 7 &&
        b.scatter! >= 4 &&
        b.scatter! <= 22,
    ),
  ).toBe(true);
  expect(owner.guns[0].mineRefs).toBeUndefined();
});
