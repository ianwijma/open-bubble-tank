import { tickGuns } from '../src/game/simulation/weapons';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';
function scenario(ids: number[], { x = 0, y = 0, speed = 2 } = {}) {
  const world = new World([], [], 1);
  world.rng.next = () => 0.5;
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      id: 'E-live-behavior',
      avatar: false,
      life: 100,
      speed,
      parts: ids.map((type, i) => ({ ...STARTER.parts[1], key: `part-${i}`, type })),
    },
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

test('World translates with preceding rotation and source twips before updating behavior destinations', () => {
  const { world, tank } = scenario([6001]);
  world.player.x = 300;
  tank.movement.frames = 2;
  tank.movement.rate = 3;
  tank.velocity = { x: 0.08, y: 0.08 };
  world.step(emptyInput());
  expect([tank.x, tank.y, tank.rotation]).toEqual([2.05, 0.05, 3]);
  expect(tank.movement.swarmPoint).toEqual({ x: 300, y: 0 });
  expect(tank.movement.frames).toBe(1);
  expect(tank.guns[0].behaviorTarget!.target).toBe(world.player);
  world.step(emptyInput());
  expect(tank.rotation).toBe(6);
  expect(tank.movement.frames).toBeGreaterThan(0); // Plans toward preceding frame's point.
});

test('Wall Flower and Aggressor share one destination in registered authored order', () => {
  for (const ids of [
    [6005, 6001],
    [6001, 6005],
  ]) {
    const { world, tank } = scenario(ids, { x: 100 });
    world.player.x = 200;
    world.step(emptyInput());
    const wall = tank.guns.find((g) => g.part.type === 6005)!.wallFlower!;
    expect(tank.movement.wallFlower).toBe(true);
    expect(wall.age).toBe(0);
    expect(wall.point!.x).toBe(424 - tank.radius);
    expect(tank.movement.swarmPoint).toEqual(ids[1] === 6001 ? { x: 200, y: 0 } : wall.point!);
    expect(tank.movement.swarmPoint).not.toBe(wall.point);
  }
});

test('Skittish setup changes the first safety turn before any active behavior call', () => {
  const { world, tank } = scenario([6003], { x: 380 });
  expect(tank.movement.skittish).toBe(true);
  tank.status.jam = 3;
  world.step(emptyInput());
  expect(tank.movement.hold).toBe(9);
  expect(tank.movement.frames).toBe(25);
  expect(tank.movement.safety).toBe(true);
  expect(tank.movement.swarmPoint).toBeNull();
});

test('jam blocks Wall Flower while movement advances, then reset resumes and stun/pause hold its clock', () => {
  const { world, tank } = scenario([6005], { x: 100 });
  const wall = tank.guns[0].wallFlower!;
  tank.status.jam = 2;
  world.step(emptyInput());
  expect(tank.x).toBe(102);
  expect(tank.movement.wallFlower).toBe(false);
  expect(wall.point).toBeUndefined();
  world.step(emptyInput());
  expect(tank.x).toBe(104);
  expect(tank.movement.wallFlower).toBe(true);
  expect(wall.age).toBe(0);
  tank.status.stun = 1;
  world.step(emptyInput());
  expect(tank.x).toBe(104);
  expect(wall.age).toBe(0);
  world.pause();
  world.step(emptyInput());
  expect(wall.age).toBe(0);
  world.resume();
  world.step(emptyInput());
  expect(wall.age).toBe(1);
});

test('factory interleaves registered behavior Setup draws and duplicate constructor draws', () => {
  const world = new World([], [], 1),
    draws = [0, 1, 0.2, 0.4, 0.6, 1, 1];
  let calls = 0;
  world.rng.next = () => {
    if (calls >= draws.length) throw new Error('extra constructor/Setup draw');
    return draws[calls++];
  };
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      parts: [6004, 6004, 6005, 6003].map((type, i) => ({
        ...STARTER.parts[1],
        key: `${i}`,
        type,
      })),
    },
    'enemy',
    20,
    30,
    undefined,
    undefined,
    world,
  );
  expect(calls).toBe(7);
  expect(tank.guns.map((g) => g.part.type)).toEqual([6004, 6005, 6003]);
  expect(tank.guns[0].phasing!.counter).toBe(0);
  expect(tank.guns[1].wallFlower).toMatchObject({ age: 0, frequency: 0.05, amplitude: 16 });
  expect(tank.guns.every((g) => g.behaviorTarget!.target === world.player)).toBe(true);
  expect(tank.movement.lastAngle).toBe(0); // Source movement Setup precedes external x/y placement.
  expect(tank.design.parts).toHaveLength(4);
});

test('Healer retains its beam/patient owner and writes the post-run patient destination', () => {
  const { world, tank } = scenario([6002], { x: 100 });
  const patient = createTank(
    world.nextId(),
    { ...STARTER, parts: [], avatar: false, life: 100, speed: 0 },
    'enemy',
    250,
    0,
    100,
    50,
  );
  world.field.enemies.push(patient);
  world.step(emptyInput());
  expect(tank.guns[0].patientId).toBe(patient.uid);
  expect(tank.movement.swarmPoint).toEqual({ x: 250, y: 0 });
});

test('destination behavior retains an outgoing ally and uses current-wrapper population through travel', () => {
  const { world } = scenario([], { speed: 0 });
  cacheEmptyField(world);
  const ally = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, speed: 0, parts: [] },
    'ally',
    50,
    30,
  );
  world.allies = [ally];
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  world.transit!.offset = { x: 800, y: 0 };
  const incoming = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [{ ...STARTER.parts[1], type: 6001 }],
    },
    'enemy',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  const state = incoming.guns[0].behaviorTarget!;
  state.target = ally;
  state.allies = 1;
  world.transit!.next.enemies = [incoming];
  world.step(emptyInput());
  expect(state.target).toBe(ally);
  expect(incoming.movement.swarmPoint).toEqual({ x: -750, y: 30 });
});

test('allied 7001 and 4001 primary weapons keep authored order before behavior writes', () => {
  const { world } = scenario([], { x: 100, speed: 0 });
  const ally = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      parts: [6001, 7001, 4001].map((type, i) => ({ ...STARTER.parts[1], key: `${i}`, type })),
    },
    'ally',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  world.allies = [ally];
  world.actorParents.sync(world);
  const fired: { type: number; destination: unknown }[] = [];
  world.spawnVolley = (_owner, gun) => {
    fired.push({ type: gun.part.type, destination: ally.movement.swarmPoint });
    return [];
  };
  for (const gun of ally.guns) gun.counter = 1000;
  tickGuns(world, ally, emptyInput());
  expect(fired).toEqual([
    { type: 7001, destination: null },
    { type: 4001, destination: null },
  ]);
  expect(ally.movement.swarmPoint).toEqual({ x: 100, y: 0 });
});

test('source category 7001 registers only on allied actors while authored visuals remain', () => {
  const parts = [7001, 4001, 6001].map((type, i) => ({ ...STARTER.parts[1], key: `${i}`, type }));
  const design = { ...STARTER, avatar: false, parts };
  const enemy = createTank(10, design, 'enemy'),
    ally = createTank(11, design, 'ally');
  expect(enemy.guns.map((g) => g.part.type)).toEqual([4001, 6001]);
  expect(ally.guns.map((g) => g.part.type)).toEqual([7001, 4001, 6001]);
  expect(enemy.design.parts).toBe(parts);
});
