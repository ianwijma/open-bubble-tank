import { expect, test } from 'bun:test';
import { moveEnemy } from '../src/game/simulation/ai';
import { tickBehavior } from '../src/game/simulation/behaviors';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { Random, direction, length } from '../src/game/core/math';
import { STARTER } from '../src/game/data/catalog';
import type { TankDesign } from '../src/game/core/types';

const design = (ids: number[] = [], speed = 2): TankDesign => ({
  ...STARTER,
  id: 'E-ai-test',
  avatar: false,
  speed,
  life: 100,
  parts: [
    STARTER.parts[0],
    ...ids.map((type, i) => ({ ...STARTER.parts[1], type, key: `behavior${i}` })),
  ],
});
function quietRandom() {
  const random = new Random(1);
  random.next = () => 0.5;
  return random;
}
function scenario(ids: number[], x = 0, y = 0, speed = 2) {
  const world = new World([], [], 1);
  world.rng.next = () => 0.5;
  const tank = createTank(
    world.nextId(),
    design(ids, speed),
    'enemy',
    x,
    y,
    undefined,
    undefined,
    world,
  );
  world.field.enemies = [tank];
  world.field.cleared = false;
  return { world, tank };
}
test('wandering translates before an existing turn and damps force by vector length', () => {
  const tank = createTank(10, design(), 'enemy');
  tank.movement.frames = 2;
  tank.movement.rate = 3;
  tank.velocity = { x: 0.08, y: 0.08 };
  moveEnemy(tank, 1, quietRandom());
  expect(tank.x).toBeCloseTo(2.08);
  expect(tank.y).toBeCloseTo(0.08);
  expect(tank.rotation).toBe(3);
  expect(tank.movement.frames).toBe(1);
  expect(tank.velocity.x).toBeCloseTo(0.072);
  moveEnemy(tank, 1, quietRandom());
  expect(tank.rotation).toBe(6);
  expect(tank.velocity).toEqual({ x: 0, y: 0 });
});
test('safety turns use radial history and the reversed signed random range, then hold without turning on the planning frame', () => {
  const tank = createTank(10, design(), 'enemy', 390, 0);
  const rng = quietRandom();
  moveEnemy(tank, 1, rng);
  expect(tank.x).toBe(392);
  expect(tank.rotation).toBe(0);
  expect(tank.movement).toMatchObject({
    frames: 50,
    rate: -3,
    hold: 29,
    safety: true,
    lastAngle: 0,
  });
  moveEnemy(tank, 1, rng);
  expect(tank.rotation).toBe(-3);
  expect(tank.movement).toMatchObject({ frames: 49, hold: 28 });
  const crossing = createTank(11, design(), 'enemy', -390, 1);
  crossing.rotation = 180;
  crossing.movement.lastAngle = -179;
  moveEnemy(crossing, 1, rng);
  expect(crossing.movement.rate).toBe(-3);
});
test('skittish safety countdown keeps source fractional and negative frames instead of clamping at zero', () => {
  const { tank } = scenario([6003], 390);
  const rng = quietRandom();
  rng.next = () => 0; // -120 degrees /3 =40, halved to20.
  moveEnemy(tank, 1, rng);
  expect(tank.movement).toMatchObject({ frames: 20, hold: 9, rate: -3 });
  tank.movement.frames = 0.5;
  tank.movement.safety = true;
  moveEnemy(tank, 1, rng);
  expect(tank.movement.frames).toBe(-0.5);
  moveEnemy(tank, 1, rng);
  expect(tank.movement.frames).toBe(-1.5);
});
test('the shipped outer-ring wander predicate reads a function, so it does not bias the random turn toward the center', () => {
  const tank = createTank(10, design(), 'enemy', 350, 0),
    rng = quietRandom();
  tank.rotation = 180;
  const rolls = [0, 0.999];
  rng.next = () => rolls.shift() ?? 0.5;
  moveEnemy(tank, 1, rng);
  expect(tank.movement.frames).toBe(33);
  expect(tank.movement.rate).toBe(3);
  expect(tank.rotation).toBe(180);
});
test('aggressor BehaviorRun follows movement and plans a turn on the following Run, without same-frame rotation', () => {
  const { world, tank } = scenario([6001]);
  world.player.x = 400;
  tank.rotation = 90;
  world.step(emptyInput());
  expect(tank.y).toBeCloseTo(2);
  expect(tank.rotation).toBe(90);
  expect(tank.movement.swarmPoint).toEqual({ x: 400, y: 0 });
  world.step(emptyInput());
  expect(tank.y).toBeCloseTo(4);
  expect(tank.rotation).toBe(90);
  expect(tank.movement.frames).toBe(30);
  world.step(emptyInput());
  expect(tank.y).toBeCloseTo(6);
  expect(tank.rotation).toBeLessThan(90);
});
test('allies without a behavior wander, and the source 200px pursuit gate uses the post-movement position', () => {
  const tank = createTank(10, design(), 'ally');
  moveEnemy(tank, 1, quietRandom());
  expect(tank.movement.swarmPoint).toBeNull();
  tank.movement.swarmPoint = { x: 2, y: 200 };
  moveEnemy(tank, 1, quietRandom());
  expect(tank.movement.frames).toBe(30); // Position4,0 is just beyond200 from2,200.
  tank.movement.frames = 0;
  tank.movement.swarmPoint = { x: 6, y: 200 };
  moveEnemy(tank, 1, quietRandom());
  expect(tank.movement.frames).toBe(0); // Exactly200 is not greater than40000 squared.
});
test('boss B1 fixes its center, advances the preceding plan, then samples the avatar for the next turn', () => {
  const tank = createTank(10, { ...design(), id: 'B1-test' }, 'enemy', 100, 100);
  moveEnemy(tank, 1, quietRandom(), { x: 0, y: 400 });
  expect([tank.x, tank.y, tank.rotation, tank.movement.frames]).toEqual([0, 0, 0, 30]);
  moveEnemy(tank, 1, quietRandom(), { x: 0, y: 400 });
  expect([tank.x, tank.y, tank.rotation]).toEqual([0, 0, 3]);
});
test('Wall Flower captures a radial destination/direction and advances it only within the source arrival gate', () => {
  const { world, tank } = scenario([6005], 100),
    gun = tank.guns[0];
  tickBehavior(world, tank, gun);
  const radius = 424 - tank.radius;
  expect(tank.movement.wallFlower).toBe(true);
  expect(tank.movement.swarmPoint!.x).toBeCloseTo(radius);
  expect(gun.behavior!.wall).toMatchObject({
    age: 0,
    frequency: 0.06,
    amplitude: 15,
    direction: -1,
  });
  tickBehavior(world, tank, gun);
  expect(tank.movement.swarmPoint!.x).toBeCloseTo(radius);
  tank.x = radius;
  tickBehavior(world, tank, gun);
  const point = direction(-1, radius - Math.sin(0.12) * 15);
  expect(tank.movement.swarmPoint!.x).toBeCloseTo(point.x);
  expect(tank.movement.swarmPoint!.y).toBeCloseTo(point.y);
  expect(gun.behavior!.wall!.age).toBe(2);
});
test('Wall Flower center fallback and behavior ordering remain distinct from tank UID and hardcoded priority', () => {
  const { world, tank } = scenario([6005, 6001], 0, 0, 0);
  world.player.x = 200;
  tickBehavior(world, tank, tank.guns[0]);
  expect(tank.x).toBe(1);
  tickBehavior(world, tank, tank.guns[1]);
  expect(tank.movement.swarmPoint).toEqual({ x: 200, y: 0 });
  expect(tank.movement.wallFlower).toBe(true);
});
test('Skittish retains a previous point behind its facing arc, preserves the positive-wrap bug, and uses a 700px origin-centered target', () => {
  const { world, tank } = scenario([6003]),
    gun = tank.guns[0];
  tank.movement.swarmPoint = { x: 1, y: 2 };
  tank.rotation = -170;
  Object.assign(world.player, direction(170, 100));
  tickBehavior(world, tank, gun);
  expect(tank.movement.swarmPoint).toEqual({ x: 1, y: 2 });
  tank.rotation = 0;
  world.player.x = 100;
  world.player.y = 0;
  tickBehavior(world, tank, gun);
  expect(length(tank.movement.swarmPoint!)).toBeCloseTo(700);
  expect(tank.movement.swarmPoint!.y).toBeLessThan(0);
  world.player.x = 601;
  tickBehavior(world, tank, gun);
  expect(tank.movement.swarmPoint).toBeNull();
});
test('Phasing uses its own constructor counter and accumulates alpha only during active behavior frames', () => {
  const { world, tank } = scenario([6004, 6004]),
    gun = tank.guns[0];
  expect(tank.guns).toHaveLength(1); // RegisterBehaviorPart suppresses repeated IDs.
  gun.behavior!.cloak = 30;
  tank.age = 999;
  for (let i = 0; i < 20; i++) tickBehavior(world, tank, gun);
  expect(tank.alpha).toBeCloseTo(0.6);
  for (let i = 0; i < 100; i++) tickBehavior(world, tank, gun);
  expect(tank.alpha).toBeCloseTo(0.6);
  tickBehavior(world, tank, gun);
  expect(tank.alpha).toBeCloseTo(0.62);
  tank.status.jam = 2;
  const counter = gun.behavior!.cloak;
  world.step(emptyInput());
  expect(gun.behavior!.cloak).toBe(counter);
  tank.status.stun = 2;
  const x = tank.x;
  world.step(emptyInput());
  expect(tank.x).toBe(x);
  expect(gun.behavior!.cloak).toBe(counter);
});
test('the source integer roll supports descending bounds instead of clamping to their first endpoint', () => {
  const rng = quietRandom();
  expect(rng.int(-120, -180)).toBe(-150);
  rng.next = () => 0;
  expect(rng.int(-120, -180)).toBe(-120);
  rng.next = () => 0.999;
  expect(rng.int(-120, -180)).toBe(-180);
});

test('behavior target acquisition retains the source inclusive ally-index miss instead of replacing it with a valid ally', () => {
  const { world, tank } = scenario([6001]),
    gun = tank.guns[0];
  world.allies = [createTank(world.nextId(), design(), 'ally', 50, 0)];
  gun.behavior!.targetId = null;
  gun.behavior!.allies = 1;
  const draws = [0, 0.999];
  world.rng.next = () => draws.shift() ?? 0.5;
  tickBehavior(world, tank, gun);
  expect(gun.behavior!.targetId).toBeNull();
  expect(tank.movement.swarmPoint).toBeNull();
  tickBehavior(world, tank, gun);
  expect(gun.behavior!.targetId as number | null).toBe(world.player.uid);
});
test('a destination behavior retains an attached outgoing ally and transforms its point into the destination parent', () => {
  const { world } = scenario([], 100, 0, 0);
  world.allies = [createTank(world.nextId(), design([], 0), 'ally', 50, 30)];
  const ally = world.allies[0];
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const transit = world.transit!,
    incoming = createTank(
      world.nextId(),
      design([6001], 0),
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    );
  incoming.guns[0].behavior!.targetId = ally.uid;
  incoming.guns[0].behavior!.allies = 1;
  transit.next.enemies = [incoming];
  world.step(emptyInput());
  expect(incoming.movement.swarmPoint).toEqual({
    x: ally.x - transit.offset.x,
    y: ally.y - transit.offset.y,
  });
});
