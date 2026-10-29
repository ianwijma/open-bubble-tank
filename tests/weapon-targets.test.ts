import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { tickGuns } from '../src/game/simulation/weapons';
import { weaponAimPoint } from '../src/game/simulation/weapon-targets';
import { STARTER } from '../src/game/data/catalog';
import { WEAPONS } from '../src/game/data/weapons';

const design = (ids: number[]) => ({
  ...STARTER,
  id: 'E-target-test',
  avatar: false,
  speed: 0,
  life: 100,
  parts: [
    STARTER.parts[0],
    ...ids.map((type, i) => ({ ...STARTER.parts[1], type, key: `gun${i}`, x: 0, y: 0 })),
  ],
});
function scenario(ids = [4001]) {
  const world = new World([], [], 3);
  world.player.x = 100;
  const ally = createTank(world.nextId(), design([]), 'ally', 0, 100);
  world.allies = [ally];
  world.rng.next = () => 0.99;
  const owner = createTank(world.nextId(), design(ids), 'enemy', 0, 0, undefined, undefined, world);
  world.field.enemies = [owner];
  for (const gun of owner.guns) gun.targeting!.allies = 1;
  return { world, ally, owner, gun: owner.guns[0] };
}
test('mounted weapons acquire and retain independent source targets during Setup', () => {
  const { world, ally } = scenario([]);
  const values = [0, 0, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  const owner = createTank(
    world.nextId(),
    design([4001, 4001]),
    'enemy',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  expect(owner.guns.map((g) => g.targeting!.targetId)).toEqual([ally.uid, world.player.uid]);
  for (const gun of owner.guns) gun.targeting!.allies = 1;
  tickGuns(world, owner, emptyInput());
  expect(owner.guns.map((g) => g.angle)).toEqual([90, 0]);
  expect(owner.guns[0].targeting).not.toBe(owner.guns[1].targeting);
});
test('ally-count retargeting follows Aim, so a ready shot keeps the preceding target angle', () => {
  const { world, ally, owner, gun } = scenario();
  gun.targeting = { targetId: ally.uid, allies: 0 };
  gun.counter = WEAPONS[4001].rate - 1;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting.targetId).toBe(world.player.uid);
  expect(world.bullets[0].angle).toBe(90);
  expect(world.bullets[0].targetId).toBeNull();
  gun.counter = WEAPONS[4001].rate - 1;
  tickGuns(world, owner, emptyInput());
  expect(world.bullets[1].angle).toBe(0);
});
test('an inclusive ally-index miss can occur twice without advancing the weapon timer', () => {
  const { world, owner, gun } = scenario();
  gun.targeting!.targetId = null;
  gun.angle = 37;
  gun.counter = WEAPONS[4001].rate - 1;
  const values = [0, 0.99, 0, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting!.targetId).toBeNull();
  expect(gun.angle).toBe(37);
  expect(gun.counter).toBe(WEAPONS[4001].rate - 1);
  expect(world.bullets).toHaveLength(0);
  tickGuns(world, owner, emptyInput());
  expect(world.bullets).toHaveLength(1);
});
test('EnemyAim acquisition after a failed Run retry keeps the old angle even when its second retry succeeds', () => {
  const { world, owner, gun } = scenario();
  gun.targeting!.targetId = null;
  gun.angle = 37;
  gun.counter = WEAPONS[4001].rate - 1;
  const values = [0, 0.99, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting!.targetId as number | null).toBe(world.player.uid);
  expect(gun.angle).toBe(37);
  expect(world.bullets[0].angle).toBe(37);
});
test('dead but attached targets remain referenced until the source parent detaches', () => {
  const { world, ally, owner, gun } = scenario();
  gun.targeting!.targetId = ally.uid;
  ally.dead = true;
  tickGuns(world, owner, emptyInput());
  expect(gun.angle).toBe(90);
  expect(gun.targeting!.targetId).toBe(ally.uid);
  world.allies = [];
  tickGuns(world, owner, emptyInput());
  expect(gun.angle).toBe(0);
  expect(gun.targeting!.targetId as number | null).toBe(world.player.uid);
});
test('allied autocannon predicts from the closest detail and preserves the doubled-center range estimate', () => {
  const world = new World([], [], 3);
  world.rng.next = () => 0.5;
  const target = createTank(
    world.nextId(),
    { ...design([]), speed: 2, parts: [{ ...STARTER.parts[0], x: 10, y: 0 }] },
    'enemy',
    100,
    30,
  );
  target.rotation = 90;
  world.field.enemies = [target];
  const ally = createTank(
    world.nextId(),
    design([7001]),
    'ally',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  const point = weaponAimPoint(world, ally, ally.guns[0]);
  expect(point!.x).toBeCloseTo(100);
  expect(point!.y).toBeCloseTo(82); // round(hypot(200,70)/10)=21; projected motion42px.
  target.stunned = true;
  expect(weaponAimPoint(world, ally, ally.guns[0])!.y).toBeCloseTo(40);
});
test('an ally without an enemy holds its timer while Wall Flower still executes BehaviorRun', () => {
  const world = new World([], [], 3);
  const ally = createTank(
    world.nextId(),
    design([7001, 6005]),
    'ally',
    100,
    0,
    undefined,
    undefined,
    world,
  );
  ally.guns[0].counter = 11;
  tickGuns(world, ally, emptyInput());
  expect(ally.guns[0].counter).toBe(11);
  expect(world.bullets).toHaveLength(0);
  expect(ally.movement.swarmPoint).not.toBeNull();
});
test('healer Setup acquires a patient separately from the mounted offensive target', () => {
  const { world, owner } = scenario([]);
  owner.life = 50;
  const healer = createTank(
    world.nextId(),
    design([4001, 6002]),
    'enemy',
    50,
    0,
    undefined,
    undefined,
    world,
  );
  expect(healer.guns[0].targeting!.targetId).toBe(world.player.uid);
  expect(healer.guns[1].patientId).toBe(owner.uid);
});

test('a healer keeps its detached patient through AcquireTarget/Aim and replaces it only in PartCallRun cleanup', () => {
  const { world, owner } = scenario([]);
  owner.life = 50;
  const replacement = createTank(world.nextId(), design([]), 'enemy', 0, 100);
  replacement.life = 50;
  world.field.enemies.push(replacement);
  const healer = createTank(
      world.nextId(),
      design([6002]),
      'enemy',
      50,
      0,
      undefined,
      undefined,
      world,
    ),
    gun = healer.guns[0];
  world.field.enemies.push(healer);
  gun.targeting!.allies = 1;
  gun.angle = 37;
  expect(gun.patientRef).toBe(owner);
  world.field.enemies = [replacement, healer];
  expect(weaponAimPoint(world, healer, gun)).toBeNull();
  expect(gun.patientRef).toBe(owner);
  tickGuns(world, healer, emptyInput());
  expect(gun.angle).toBe(37);
  expect(gun.patientRef).toBe(replacement);
  expect(gun.counter).toBe(0);
  expect(healer.movement.swarmPoint).toEqual({ x: 0, y: 100 });
});
