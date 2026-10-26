import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { movePickup, pickupValues } from '../src/game/simulation/pickups';
import type { Pickup } from '../src/game/core/types';

function pickup(world: World, x: number, options: Partial<Pickup> = {}): Pickup {
  const value: Pickup = {
    uid: world.nextId(),
    x,
    y: 0,
    value: 1,
    vx: 0,
    vy: 0,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: false,
    dead: false,
    ...options,
  };
  world.pickups.push(value);
  return value;
}

test('pickup contact is checked before movement; a near-center latch pays on the following frame', () => {
  const world = new World([], [], 1);
  world.hitTest = (_, x) => x < 20;
  const value = pickup(world, 20, { forced: true });
  world.step(emptyInput());
  expect(value.x).toBe(6);
  expect(value.collected).toBe(false);
  expect(world.player.life).toBe(1);
  world.step(emptyInput());
  expect(world.pickups).toEqual([]);
  expect(world.player.life).toBe(2);
  world.hitTest = () => false;
  const center = pickup(world, 5);
  world.step(emptyInput());
  expect(center.collected).toBe(true);
  expect(world.player.life).toBe(2);
  world.step(emptyInput());
  expect(world.player.life).toBe(3);
  expect(world.pickups).toEqual([]);
});

test('visible contact collects during scattering without taking a movement step', () => {
  const world = new World([], [], 1),
    value = pickup(world, 0, { vx: 20, scattering: true });
  world.step(emptyInput());
  expect(world.player.life).toBe(2);
  expect(value.x).toBe(0);
  expect(value.dead).toBe(true);
});

test('scattering damps before movement and transitions into attraction on the sub-half-pixel frame', () => {
  const world = new World([], [], 1),
    value = pickup(world, 50, { vx: 1, scattering: true });
  world.hitTest = () => false;
  for (let i = 0; i < 6; i++) {
    world.step(emptyInput());
    expect(value.scattering).toBe(true);
    expect(value.vx).toBeCloseTo(0.9 ** (i + 1));
  }
  const before = value.x,
    scattered = before + 0.9 ** 7;
  world.step(emptyInput());
  expect(value.scattering).toBe(false);
  expect(value.x).toBeCloseTo(scattered - (1 - scattered / 100) * 7);
});

test('acquisition remains strictly within 100px for every class; only attraction speed scales cubically', () => {
  for (const classId of [1, 3, 6]) {
    const world = new World([], [], 1);
    world.player.design = { ...world.player.design, classId };
    const far = pickup(world, 100),
      near = pickup(world, 99);
    movePickup(world, far);
    movePickup(world, near);
    expect(far.x).toBe(100);
    expect(near.x).toBeCloseTo(99 - (1 - 99 / (100 * classId ** 3)) * 7);
  }
});

test('completion attraction cancels scattering and pulls at fourteen pixels from any range', () => {
  const world = new World([], [], 1),
    value = pickup(world, 300, { forced: true, scattering: true, vx: 22 });
  movePickup(world, value);
  expect(value.scattering).toBe(false);
  expect(value.x).toBe(286);
  expect(value.vx).toBe(-14);
});

test('bounds are checked before moving; removal from the live vector defers its next pickup', () => {
  const world = new World([], [], 1);
  world.hitTest = () => false;
  const first = pickup(world, 414, { vx: 20, scattering: true });
  const second = pickup(world, -200, { vx: 1, scattering: true });
  world.step(emptyInput());
  expect(first.x).toBe(432);
  const secondX = second.x;
  world.step(emptyInput());
  expect(world.pickups).toEqual([second]);
  expect(second.x).toBe(secondX);
  world.step(emptyInput());
  expect(second.x).toBeGreaterThan(secondX);
});

test('collection audio uses each field timer rather than the world-frame remainder and freezes in pause', () => {
  const world = new World([], [], 1);
  const events: number[] = [];
  for (let frame = 0; frame < 11; frame++) {
    pickup(world, 0);
    world.step(emptyInput());
    if (world.drainEvents().some((event) => event.type === 'collect')) events.push(frame);
  }
  expect(events).toEqual([0, 5, 10]);
  expect(world.stats.collected).toBe(11);
  const counter = world.runtimeFor(world.field).collectTimer;
  world.pause();
  world.step(emptyInput());
  expect(world.runtimeFor(world.field).collectTimer).toBe(counter);
});

test('denominations preserve the recovered small-drop distribution and large-drop remainder bug', () => {
  expect(pickupValues(4)).toEqual([1, 1, 1, 1]);
  expect(pickupValues(8)).toEqual([5, 1, 1, 1]);
  expect(pickupValues(13)).toEqual([5, ...Array(8).fill(1)]);
  expect(pickupValues(20)).toEqual([5, 5, 5, 5]);
  expect(pickupValues(51)).toEqual([50]);
  expect(pickupValues(55)).toEqual([50, 5, 1]);
  expect(pickupValues(76)).toEqual([50, 5, 5, 5, 5, 5]);
  expect(pickupValues(99)).toEqual([50, ...Array(9).fill(5), 1, 1, 1, 1]);
  expect(pickupValues(100)).toEqual([50, 50]);
});
