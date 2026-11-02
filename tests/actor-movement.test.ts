import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { Random } from '../src/game/core/math';
import { createTank } from '../src/game/simulation/tank';
import { actorAngle, createActorMovement, moveActor } from '../src/game/simulation/actor-movement';

function actor() {
  return {
    ...createTank(10, { ...STARTER, id: 'E-motion-test', avatar: false, speed: 2 }, 'enemy'),
    movement: createActorMovement(),
  };
}
function quietRandom() {
  const rng = new Random(1);
  rng.next = () => 0.5;
  return rng;
}

test('translation stores source twips before applying the preceding turn and damps force by whole-vector length', () => {
  const tank = actor();
  tank.movement.frames = 2;
  tank.movement.rate = 3;
  tank.velocity = { x: 0.08, y: 0.08 };
  moveActor(tank, 1, quietRandom());
  expect([tank.x, tank.y, tank.rotation]).toEqual([2.05, 0.05, 3]);
  expect(tank.movement.frames).toBe(1);
  expect(tank.velocity.x).toBeCloseTo(0.072);
  expect(tank.velocity.y).toBeCloseTo(0.072);
  moveActor(tank, 1, quietRandom());
  expect(tank.rotation).toBe(6);
  expect(tank.velocity).toEqual({ x: 0, y: 0 });
});

test('movement setup owns independent state and samples the source radial heading', () => {
  const first = createActorMovement({ x: 0, y: 10 }),
    second = createActorMovement();
  expect(first.lastAngle).toBe(90);
  expect(second.lastAngle).toBe(0);
  first.swarmPoint = { x: 20, y: 30 };
  expect(second.swarmPoint).toBeNull();
  expect(second).toMatchObject({
    frames: 0,
    rate: 0,
    hold: 0,
    safety: false,
    wallFlower: false,
    skittish: false,
    stationary: false,
  });
});

test('safety turns use radial history and reversed rolls without rotating on the planning frame', () => {
  const tank = actor();
  tank.x = 390;
  moveActor(tank, 1, quietRandom());
  expect([tank.x, tank.y, tank.rotation]).toEqual([392, 0, 0]);
  expect(tank.movement).toMatchObject({
    frames: 50,
    rate: -3,
    hold: 29,
    safety: true,
    lastAngle: 0,
  });
  moveActor(tank, 1, quietRandom());
  expect(tank.rotation).toBe(-3);
  expect(tank.movement).toMatchObject({ frames: 49, hold: 28 });
  const crossing = actor();
  crossing.x = -390;
  crossing.y = 1;
  crossing.rotation = 180;
  crossing.movement.lastAngle = -179;
  moveActor(crossing, 1, quietRandom());
  expect(crossing.movement.rate).toBe(-3);
});

test('Skittish keeps the halved fractional counter and negative countdown quirk', () => {
  const tank = actor(),
    rng = quietRandom();
  tank.x = 390;
  tank.movement.skittish = true;
  rng.next = () => 0;
  moveActor(tank, 1, rng);
  expect(tank.movement).toMatchObject({ frames: 20, rate: -3, hold: 9, safety: true });
  tank.movement.frames = 0.5;
  moveActor(tank, 1, rng);
  expect(tank.movement.frames).toBe(-0.5);
  moveActor(tank, 1, rng);
  expect(tank.movement.frames).toBe(-1.5);
});

test('pursuit samples the translated position with a strict 200px gate and Wall Flower bypass', () => {
  const tank = actor();
  tank.side = 'ally';
  moveActor(tank, 1, quietRandom());
  expect(tank.movement.swarmPoint).toBeNull();
  tank.movement.swarmPoint = { x: 2, y: 200 };
  moveActor(tank, 1, quietRandom());
  expect(tank.movement.frames).toBe(30);
  tank.movement.frames = 0;
  tank.movement.swarmPoint = { x: 6, y: 200 };
  moveActor(tank, 1, quietRandom());
  expect(tank.movement.frames).toBe(0);
  tank.movement.wallFlower = true;
  tank.movement.swarmPoint = { x: 8, y: 200 };
  moveActor(tank, 1, quietRandom());
  expect(tank.movement.frames).toBe(30);
});

test('stationary enemies apply only force while allies ignore the stationary flag', () => {
  const tank = actor();
  tank.movement.stationary = true;
  tank.movement.frames = 4;
  tank.velocity = { x: 0.08, y: -0.08 };
  moveActor(tank, 1, quietRandom());
  expect([tank.x, tank.y, tank.rotation]).toEqual([0.05, -0.05, 0]);
  expect(tank.velocity.x).toBeCloseTo(0.072);
  expect(tank.movement.frames).toBe(4);
  moveActor(tank, 1, quietRandom());
  expect(tank.velocity).toEqual({ x: 0, y: 0 });
  const ally = actor();
  ally.side = 'ally';
  ally.movement.stationary = true;
  moveActor(ally, 1, quietRandom());
  expect(ally.x).toBe(2);
});

test('boss B1 centers, advances the previous turn then plans from the avatar; other boss branches do nothing', () => {
  const tank = actor();
  tank.design = { ...tank.design, id: 'B1-test' };
  tank.x = tank.y = 100;
  tank.status.sticky = 5;
  tank.velocity = { x: 0.2, y: 0 };
  moveActor(tank, 1, quietRandom(), { x: 0, y: 400 });
  expect([tank.x, tank.y, tank.rotation, tank.movement.frames]).toEqual([0, 0, 0, 30]);
  expect(tank.velocity.x).toBeCloseTo(0.18);
  moveActor(tank, 1, quietRandom(), { x: 0, y: 400 });
  expect(tank.rotation).toBe(3);
  const other = actor();
  other.design = { ...other.design, id: 'B2-test' };
  other.x = 100;
  other.velocity = { x: 0.2, y: 0 };
  moveActor(other, 1, quietRandom(), { x: 0, y: 400 });
  expect([other.x, other.y, other.rotation, other.velocity.x]).toEqual([100, 0, 0, 0.2]);
});

test('opposite-direction planning retains the source signed 180-degree ties', () => {
  expect([actorAngle(180), actorAngle(-180), actorAngle(540), actorAngle(-540)]).toEqual([
    180, -180, 180, -180,
  ]);
  const positive = actor();
  positive.movement.swarmPoint = { x: -400, y: 0 };
  moveActor(positive, 1, quietRandom());
  expect(positive.movement).toMatchObject({ frames: 60, rate: 3 });
  const negative = actor();
  negative.movement.swarmPoint = { x: -400, y: -0 };
  moveActor(negative, 1, quietRandom());
  expect(negative.movement).toMatchObject({ frames: 60, rate: -3 });
});

test('the shipped GetLength property read keeps outer-ring wandering unbiased', () => {
  const tank = actor(),
    rng = quietRandom(),
    draws = [0, 0.999];
  tank.x = 350;
  tank.rotation = 180;
  let index = 0;
  rng.next = () => draws[index++] ?? 0.5;
  moveActor(tank, 1, rng);
  expect(tank.movement).toMatchObject({ frames: 33, rate: 3 });
  expect(tank.rotation).toBe(180);
  expect(index).toBe(2);
});

test('zero-speed pursuit and a zero wander roll retain source Infinity/NaN state', () => {
  const stopped = actor();
  stopped.design = { ...stopped.design, speed: 0 };
  stopped.movement.swarmPoint = { x: 0, y: 400 };
  moveActor(stopped, 1, quietRandom());
  expect(stopped.movement.frames).toBe(Infinity);
  expect(stopped.movement.rate).toBe(0);
  const tank = actor(),
    rng = quietRandom(),
    draws = [0, 0.5];
  rng.next = () => draws.shift() ?? 0.5;
  moveActor(tank, 1, rng);
  expect(tank.movement.frames).toBe(0);
  expect(Number.isNaN(tank.movement.rate)).toBe(true);
  moveActor(tank, 1, rng);
  expect(tank.rotation).toBe(0);
});

test('safety lookahead keeps the exact scaled radius boundary and sticky speed', () => {
  const exact = actor();
  exact.radius = 0;
  exact.x = 361.75;
  moveActor(exact, 1, quietRandom());
  expect(exact.movement.safety).toBe(false);
  const outside = actor();
  outside.radius = 0;
  outside.x = 361.85;
  moveActor(outside, 1, quietRandom());
  expect(outside.movement.safety).toBe(true);
  const scaled = actor();
  scaled.x = 500;
  moveActor(scaled, 2, quietRandom());
  expect(scaled.movement.safety).toBe(false);
  const sticky = actor();
  sticky.status.sticky = 1;
  moveActor(sticky, 1, quietRandom());
  expect(sticky.x).toBe(0.6);
});
