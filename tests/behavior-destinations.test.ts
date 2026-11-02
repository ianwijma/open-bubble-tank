import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { Random } from '../src/game/core/math';
import { createTank } from '../src/game/simulation/tank';
import { createActorMovement } from '../src/game/simulation/actor-movement';
import {
  createWallFlower,
  tickWallFlower,
  setPursuitPoint,
  setupSkittish,
  tickSkittish,
} from '../src/game/simulation/behavior-destinations';
function actor() {
  const tank = {
    ...createTank(10, { ...STARTER, avatar: false, speed: 2 }, 'enemy'),
    movement: createActorMovement(),
  };
  tank.radius = 22.5;
  return tank;
}
function quietRandom() {
  const rng = new Random(1);
  rng.next = () => 0.5;
  return rng;
}

test('Wall Flower projects with source Scale(radius / length) order and keeps an independent point', () => {
  const tank = actor(),
    state = createWallFlower(quietRandom());
  tank.x = 3;
  tank.y = 4;
  tank.rotation = 90;
  tickWallFlower(tank, state, 1);
  expect(state.point!.x).toBe(240.89999999999998);
  expect(state.point!.y).toBe(321.2);
  expect(state.direction).toBe(1);
  expect(state.radius).toBe(401.5);
  expect(tank.movement.swarmPoint).toEqual(state.point!);
  expect(tank.movement.swarmPoint).not.toBe(state.point);
});

test('Wall Flower constructors own ordered inclusive rolls and independent clocks', () => {
  const rng = new Random(1),
    draws = [0, 1, 1, 0];
  let calls = 0;
  rng.next = () => draws[calls++];
  const first = createWallFlower(rng),
    second = createWallFlower(rng);
  expect(first).toEqual({ age: 0, frequency: 0.02, amplitude: 20 });
  expect(second).toEqual({ age: 0, frequency: 0.1, amplitude: 10 });
  expect(calls).toBe(4);
  tickWallFlower(actor(), first, 1);
  tickWallFlower(actor(), first, 1);
  expect(first.age).toBe(1);
  expect(second.age).toBe(0);
});

test('Wall Flower center fallback and signed direction run only on first call', () => {
  for (const [rotation, direction] of [
    [0, -1],
    [90, 1],
    [-180, -1],
    [180, 1],
  ]) {
    const tank = actor(),
      state = createWallFlower(quietRandom());
    tank.x = tank.y = 0;
    tank.rotation = rotation;
    tickWallFlower(tank, state, 2);
    expect(tank.x).toBe(1);
    expect(tank.y).toBe(0);
    expect(tank.movement.wallFlower).toBe(true);
    expect(state.age).toBe(0);
    expect(state.radius).toBe(825.5);
    expect(state.point!).toEqual({ x: 825.5, y: 0 });
    expect(state.direction).toBe(direction);
    const point = state.point;
    tickWallFlower(tank, state, 3);
    expect(state.age).toBe(1);
    expect(state.radius).toBe(825.5);
    expect(state.point).toBe(point);
  }
});

test('Wall Flower ages while far away without overwriting another behavior destination', () => {
  const tank = actor(),
    state = createWallFlower(quietRandom());
  tank.x = 1;
  tank.y = 0;
  tickWallFlower(tank, state, 1);
  const wallPoint = state.point!;
  setPursuitPoint(tank, { x: -50, y: 100 });
  const pursuit = tank.movement.swarmPoint;
  for (let frame = 0; frame < 6; frame++) tickWallFlower(tank, state, 2);
  expect(state.age).toBe(6);
  expect(state.point).toBe(wallPoint);
  expect(tank.movement.swarmPoint).toBe(pursuit);
  expect(tank.movement.wallFlower).toBe(true);
  tank.x = wallPoint.x;
  tank.y = wallPoint.y;
  tickWallFlower(tank, state, 2);
  const radius = 401.5 - Math.sin(0.06 * 7) * 15;
  expect(state.age).toBe(7);
  expect(state.point!.x).toBe(Math.cos(-Math.PI / 180) * radius);
  expect(state.point!.y).toBe(Math.sin(-Math.PI / 180) * radius);
  expect(tank.movement.swarmPoint).toEqual(state.point!);
  expect(tank.movement.swarmPoint).not.toBe(state.point);
});

test('Wall Flower arrival includes the exact radius and advances one degree in either direction', () => {
  for (const [offset, advances] of [
    [52.5, true],
    [52.5001, false],
  ] as const) {
    for (const [rotation, sign] of [
      [0, -1],
      [90, 1],
    ]) {
      const tank = actor(),
        state = createWallFlower(quietRandom());
      tank.x = 1;
      tank.y = 0;
      tank.rotation = rotation;
      tickWallFlower(tank, state, 1);
      const point = state.point!;
      tank.x = point.x - offset;
      tickWallFlower(tank, state, 9);
      expect(state.age).toBe(1);
      expect(state.radius).toBe(401.5);
      if (advances) {
        const radius = 401.5 - Math.sin(0.06) * 15;
        expect(state.point!.x).toBe(Math.cos((sign * Math.PI) / 180) * radius);
        expect(state.point!.y).toBe(Math.sin((sign * Math.PI) / 180) * radius);
      } else expect(state.point).toBe(point);
    }
  }
});

test('Wall Flower private int clock wraps even on a travelling frame', () => {
  const tank = actor(),
    state = createWallFlower(quietRandom());
  tank.x = 1;
  tank.y = 0;
  tickWallFlower(tank, state, 1);
  const point = state.point;
  state.age = 2147483647;
  tickWallFlower(tank, state, 1);
  expect(state.age).toBe(-2147483648);
  expect(state.point).toBe(point);
});

test('Aggressor and inherited Healer destination consumes a projected point copy or clears it', () => {
  const tank = actor(),
    point = { x: 310.25, y: -11.5 };
  setPursuitPoint(tank, point);
  expect(tank.movement.swarmPoint).toEqual(point);
  expect(tank.movement.swarmPoint).not.toBe(point);
  point.x = 0;
  expect(tank.movement.swarmPoint!.x).toBe(310.25);
  setPursuitPoint(tank, null);
  expect(tank.movement.swarmPoint).toBeNull();
});

test('Skittish setup precedes active calls; absent or farther than 600 clears without rolling', () => {
  const tank = actor(),
    rng = new Random(1);
  let calls = 0;
  rng.next = () => {
    calls++;
    return 0.5;
  };
  tank.x = tank.y = 0;
  tank.rotation = 0;
  setupSkittish(tank);
  expect(tank.movement.skittish).toBe(true);
  for (const point of [null, { x: 600.0001, y: 0 }]) {
    setPursuitPoint(tank, { x: 1, y: 1 });
    tickSkittish(tank, point, rng);
    expect(tank.movement.swarmPoint).toBeNull();
  }
  expect(calls).toBe(0);
  tickSkittish(tank, { x: 600, y: 0 }, rng);
  expect(calls).toBe(1);
  expect(tank.movement.swarmPoint!.x).toBeCloseTo(-121.55372436685122, 10);
  expect(tank.movement.swarmPoint!.y).toBeCloseTo(-689.3654271085456, 10);
});

test('Skittish facing boundary includes 90 degrees but rear targets retain the earlier point', () => {
  const tank = actor(),
    rng = new Random(1);
  let calls = 0;
  rng.next = () => {
    calls++;
    return 0;
  };
  tank.x = 10;
  tank.y = 0;
  tank.rotation = 0;
  tickSkittish(tank, { x: 10, y: 50 }, rng);
  expect(calls).toBe(1);
  expect(tank.movement.swarmPoint!.x).toBe(700);
  expect(tank.movement.swarmPoint!.y).toBe(0);
  const previous = tank.movement.swarmPoint;
  tickSkittish(tank, { x: 9.999, y: 50 }, rng);
  expect(calls).toBe(1);
  expect(tank.movement.swarmPoint).toBe(previous);
});

test('Skittish positive wrap bug retains a rear point while the negative wrap accepts its mirror', () => {
  const tank = actor(),
    rng = new Random(1);
  let calls = 0;
  rng.next = () => {
    calls++;
    return 0.5;
  };
  tank.x = tank.y = 0;
  tank.rotation = -180;
  setPursuitPoint(tank, { x: 1, y: 2 });
  const previous = tank.movement.swarmPoint;
  tickSkittish(tank, { x: -10, y: 1 }, rng);
  expect(calls).toBe(0);
  expect(tank.movement.swarmPoint).toBe(previous);
  tank.rotation = 180;
  tickSkittish(tank, { x: -10, y: -1 }, rng);
  expect(calls).toBe(1);
  expect(tank.movement.swarmPoint).not.toBe(previous);
});

test('Skittish chooses origin-centered 700px escape, inclusive offset and outward sign', () => {
  for (const [draw, offset] of [
    [0, 90],
    [1, 110],
  ]) {
    for (const [y, sign] of [
      [100, 1],
      [-100, -1],
    ]) {
      const tank = actor(),
        rng = new Random(1);
      tank.x = 100;
      tank.y = y;
      tank.rotation = 0;
      rng.next = () => draw;
      tickSkittish(tank, { x: 200, y }, rng);
      expect(tank.movement.swarmPoint!.x).toBe(Math.cos((sign * offset * Math.PI) / 180) * 700);
      expect(tank.movement.swarmPoint!.y).toBe(Math.sin((sign * offset * Math.PI) / 180) * 700);
      expect(Math.hypot(tank.movement.swarmPoint!.x, tank.movement.swarmPoint!.y)).toBeCloseTo(
        700,
        10,
      );
    }
  }
});
