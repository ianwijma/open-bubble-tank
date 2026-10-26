import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import type { Projectile } from '../src/game/core/types';
import { FIELD_RADIUS } from '../src/game/core/constants';
import { FieldVisit } from '../src/game/core/field-visit';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

const design = {
  ...STARTER,
  avatar: false,
  speed: 0,
  life: 100,
  reward: 0,
  parts: STARTER.parts.map((part) => (part.type === 2001 ? { ...part, type: 4001 } : part)),
};
function shot(world: World, x: number, y: number, enemy = true): Projectile {
  return {
    uid: world.nextId(),
    owner: -1,
    enemy,
    x,
    y,
    angle: 90,
    heading: 90,
    speed: 1,
    damage: 2,
    radius: 2,
    kind: 'shell',
    age: 0,
    life: 500,
    explode: 0,
    hit: new Set(),
    targetId: null,
    dead: false,
    symbol: 0,
    orbit: 0,
  };
}
function cross(world: World) {
  for (let i = 0; i < 150 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(world.mode).toBe('playing');
}
function setup() {
  const world = new World([], [], 8);
  world.player.life = 40;
  world.player.x = 425;
  const outgoing = createTank(world.nextId(), design, 'enemy', 100, 0);
  world.field.enemies = [outgoing];
  const old = world.field;
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  const incoming = createTank(world.nextId(), design, 'enemy', 100, 0);
  next.enemies = [incoming];
  return { world, old, next, outgoing, incoming, runtime: world.runtimeFor(next) };
}

test('both fields run actors and existing shots during travel; rejected new shots still reset weapon counters', () => {
  const { world, incoming, outgoing, runtime } = setup();
  const oldShot = shot(world, 0, 100),
    nextShot = shot(world, 0, 100);
  world.bullets.push(oldShot);
  runtime.bullets.push(nextShot);
  for (const tank of [outgoing, incoming]) {
    tank.guns[0].part = { ...tank.guns[0].part, type: 4001 };
    tank.guns[0].counter = 1000;
  }
  const player = { age: world.player.age, status: world.player.status.infect, x: world.player.x };
  world.step({ ...emptyInput(), fire: true });
  expect([outgoing.age, incoming.age]).toEqual([1, 1]);
  expect([oldShot.age, nextShot.age, oldShot.y, nextShot.y]).toEqual([1, 1, 101, 101]);
  expect([world.bullets.length, runtime.bullets.length]).toEqual([1, 1]);
  expect([outgoing.guns[0].counter, incoming.guns[0].counter]).toEqual([0, 0]);
  expect(world.stats.shots).toBe(0);
  expect(world.player.x).toBeGreaterThan(player.x);
  world.pause();
  world.step(emptyInput());
  expect([outgoing.age, incoming.age, oldShot.age, nextShot.age]).toEqual([1, 1, 1, 1]);
});

test('destination collision projects the actual avatar locally and restores its world position', () => {
  const { world, runtime } = setup();
  const transit = world.transit!;
  world.player.x = transit.target.x;
  world.player.y = transit.target.y;
  const bullet = shot(world, world.player.x - transit.offset.x, world.player.y - transit.offset.y);
  bullet.speed = 0;
  runtime.bullets.push(bullet);
  const old = world.player;
  world.step(emptyInput());
  expect(world.player).toBe(old);
  expect(world.player.life).toBe(38);
  expect(world.player.x).toBeCloseTo(-317 * world.field.scale);
  expect(world.player.y).toBe(0);
  expect(bullet.dead).toBe(true);
  expect(world.mode).toBe('playing');
});

test('arrival retains destination shots, pickups and allies but clears registered effects', () => {
  const { world, old, next, incoming, runtime } = setup();
  const dropped = shot(world, 0, 100),
    kept = shot(world, 0, 100);
  world.bullets.push(dropped);
  runtime.bullets.push(kept);
  const pickup = {
    uid: world.nextId(),
    x: 0,
    y: -150,
    vx: 1,
    vy: 0,
    value: 1,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  };
  runtime.pickups.push(pickup);
  const ally = createTank(
    world.nextId(),
    { ...design, parts: [STARTER.parts[0]] },
    'ally',
    0,
    -100,
  );
  runtime.allies.push(ally);
  runtime.effects.push({
    uid: world.nextId(),
    x: 0,
    y: -100,
    kind: 'hit',
    radius: 5,
    color: 0xffffff,
    duration: 500,
    age: 0,
  });
  world.player.shield = 30;
  world.player.velocity = { x: 6, y: 1 };
  cross(world);
  expect(world.field).toBe(next);
  expect(world.bullets).toContain(kept);
  expect(world.bullets).not.toContain(dropped);
  expect(world.pickups).toContain(pickup);
  expect(world.allies).toContain(ally);
  expect(world.effects).toEqual([]);
  expect(world.player.shield).toBe(0);
  expect(world.player.velocity).toEqual({ x: 0, y: 0 });
  const age = incoming.age;
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next).toBe(old);
  expect(world.runtimeFor(old).bullets).toEqual([]);
  world.step(emptyInput());
  expect(incoming.age).toBe(age + 1);
});

test('destination pickups can collect during travel and force collection on their own completed field', () => {
  const { world, next, runtime } = setup();
  next.enemies = [];
  const pickup = {
    uid: world.nextId(),
    x: world.player.x - world.transit!.offset.x,
    y: 0,
    vx: 0,
    vy: 0,
    value: 5,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
  };
  const distant = { ...pickup, uid: world.nextId(), x: 100, y: 100 };
  runtime.pickups.push(pickup, distant);
  world.step(emptyInput());
  expect(pickup.dead).toBe(true);
  expect(distant.forced).toBe(true);
  expect(world.player.life).toBe(45);
  expect(world.stats.completed).toBe(1);
});

test('an enemy killed in the bullet loop is removed and completes its field on the following field frame', () => {
  const world = new World([], [], 1);
  world.fieldVisit = new FieldVisit();
  world.field.cleared = false;
  const enemy = createTank(
    world.nextId(),
    { ...design, parts: [STARTER.parts[0]] },
    'enemy',
    100,
    0,
    1,
    1,
  );
  world.field.enemies = [enemy];
  const bullet = shot(world, 100, 0, false);
  bullet.speed = 0;
  world.bullets.push(bullet);
  world.step(emptyInput());
  expect(enemy.dead).toBe(true);
  expect(world.field.enemies).toContain(enemy);
  expect(world.stats.completed).toBe(0);
  world.step(emptyInput());
  expect(world.field.enemies).toEqual([]);
  expect(world.stats.completed).toBe(1);
});

test('boundary initiation runs both fields and the avatar once; later transit freezes avatar status', () => {
  const world = new World([], [STARTER, STARTER], 8);
  world.player.x = FIELD_RADIUS + 1;
  world.player.status.infect = Infinity;
  world.player.infectCounter = 10;
  world.step(emptyInput());
  expect(world.mode).toBe('transit');
  expect(world.player.infectCounter).toBe(11);
  expect(world.transit!.next.enemies[0].age).toBe(1);
  world.step(emptyInput());
  expect(world.player.infectCounter).toBe(11);
  expect(world.transit!.next.enemies[0].age).toBe(2);
});
