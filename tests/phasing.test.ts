import { createPhasing, tickPhasing } from '../src/game/simulation/phasing';
import { Random } from '../src/game/core/math';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

function scenario() {
  const world = new World([], [], 1);
  world.rng.next = () => 0.5;
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      id: 'E-phasing-test',
      avatar: false,
      speed: 0,
      life: 100,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 6004 }],
    },
    'enemy',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  world.field.enemies = [tank];
  world.field.cleared = false;
  return { world, tank, gun: tank.guns[0] };
}

test('jam suspends Phasing alpha independently of the actor age and movement clock', () => {
  const { world, tank } = scenario();
  tank.status.jam = 3;
  world.step(emptyInput());
  expect(tank.age).toBe(1);
  expect(tank.alpha).toBe(1);
});

test('the last blocked jam frame and stun/pause preserve the private clock, then the reset frame resumes it', () => {
  const { world, tank, gun } = scenario();
  const counter = gun.phasing!.counter;
  tank.status.jam = 2; // The simulation stores source duration plus its reset frame.
  world.step(emptyInput());
  expect(tank.status.jam).toBe(1);
  expect(gun.phasing!.counter).toBe(counter);
  expect(tank.alpha).toBe(1);
  world.step(emptyInput());
  expect(gun.phasing!.counter).toBe(counter + 1);
  const activeAlpha = tank.alpha;
  tank.status.stun = 1;
  world.step(emptyInput());
  expect(gun.phasing!.counter).toBe(counter + 1);
  expect(tank.alpha).toBe(activeAlpha);
  world.pause();
  for (let i = 0; i < 20; i++) world.step(emptyInput());
  expect(gun.phasing!.counter).toBe(counter + 1);
  expect(tank.alpha).toBe(activeAlpha);
});

test('a constructor-started Phasing cycle retains partial alpha instead of deriving it from actor age', () => {
  const { tank, gun } = scenario();
  gun.phasing!.counter = 30;
  tank.age = 999;
  for (let i = 0; i < 20; i++) tickPhasing(tank, gun);
  expect(tank.alpha).toBe(136 / 256);
  for (let i = 0; i < 100; i++) tickPhasing(tank, gun);
  expect(tank.alpha).toBe(136 / 256);
  tickPhasing(tank, gun);
  expect(tank.alpha).toBe(141 / 256);
});

test('Phasing retains fixed-point residue through its complete windows and counter reset', () => {
  const { tank, gun } = scenario();
  gun.phasing!.counter = 0;
  for (let i = 0; i < 50; i++) tickPhasing(tank, gun);
  expect([gun.phasing!.counter, tank.alpha]).toEqual([50, -1 / 256]);
  for (let i = 0; i < 100; i++) tickPhasing(tank, gun);
  expect([gun.phasing!.counter, tank.alpha]).toEqual([150, -1 / 256]);
  for (let i = 0; i < 50; i++) tickPhasing(tank, gun);
  expect([gun.phasing!.counter, tank.alpha]).toEqual([200, 249 / 256]);
  for (let i = 0; i < 100; i++) tickPhasing(tank, gun);
  expect([gun.phasing!.counter, tank.alpha]).toEqual([0, 249 / 256]);
  tickPhasing(tank, gun);
  expect([gun.phasing!.counter, tank.alpha]).toEqual([1, 243 / 256]);
});

test('registration keeps the first behavior ID and every authored visual part', () => {
  const { world } = scenario();
  const parts = [6004, 6004, 6001, 6001].map((type, i) => ({
    ...STARTER.parts[1],
    type,
    key: `behavior-${i}`,
  }));
  const tank = createTank(
    world.nextId(),
    { ...STARTER, parts, avatar: false },
    'enemy',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  expect(tank.guns.map((gun) => gun.part.key)).toEqual(['behavior-0', 'behavior-2']);
  expect(tank.guns[0].phasing!.counter).toBe(25);
  expect(tank.design.parts).toBe(parts);
  expect(tank.design.parts).toHaveLength(4);
});

test('boss movement does not suppress its registered Phasing behavior', () => {
  const { world, tank, gun } = scenario();
  tank.design = { ...tank.design, id: 'B1-phasing-test' };
  world.step(emptyInput());
  expect(gun.phasing!.counter).toBe(26);
  expect(tank.alpha).toBe(250 / 256);
});

test('each Phasing constructor consumes one draw for an independent integer counter', () => {
  const rng = new Random(1),
    draws = [0.6, 0.2];
  let index = 0;
  rng.next = () => draws[index++];
  const first = createPhasing(rng),
    second = createPhasing(rng);
  expect(first.counter).toBe(30);
  expect(second.counter).toBe(10);
  expect(first).not.toBe(second);
  expect(index).toBe(2);
  rng.next = () => 0;
  expect(Object.is(createPhasing(rng).counter, 0)).toBe(true);
});
