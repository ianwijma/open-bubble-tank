import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { tickGuns } from '../src/game/simulation/weapons';
import { weaponAimPoint } from '../src/game/simulation/weapon-targets';
import { STARTER } from '../src/game/data/catalog';
import { WEAPONS } from '../src/game/data/weapons';
import { cacheEmptyField } from './fixtures/empty-field';

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
  cacheEmptyField(world);
  world.player.x = 100;
  const ally = createTank(world.nextId(), design([]), 'ally', 0, 100);
  world.allies = [ally];
  world.rng.next = () => 0.99;
  const owner = createTank(world.nextId(), design(ids), 'enemy', 0, 0, undefined, undefined, world);
  world.field.enemies = [owner];
  for (const gun of owner.guns) if (gun.targeting) gun.targeting.allies = 1;
  world.actorParents.sync(world);
  return { world, ally, owner, gun: owner.guns[0] };
}

test('cached attachment resets primary target only, preserving master, count and behavior state', () => {
  const { world, ally, owner, gun } = scenario([4001, 6004]);
  gun.targeting = { master: 'ally', target: ally, allies: 7 };
  const behavior = owner.guns[1];
  behavior.behaviorTarget = { master: 'enemy', target: ally, allies: 8 };
  const old = world.field;
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  world.transit!.next.scale = 1;
  world.transit!.next.enemies = [];
  world.transit!.offset = { x: 800, y: 0 };
  world.transit!.target = { x: 483, y: 0 };
  owner.status.stun = 10; // Isolate reattachment from a subsequent offensive Run.
  world.player.x = 483;
  world.step(emptyInput());
  expect(world.field).not.toBe(old);
  world.editPlayer(STARTER);
  expect(gun.targeting.target).toBe(ally);
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next === old).toBe(false);
  expect(world.transit!.next.enemies).toContain(owner);
  expect(gun.targeting).toEqual({ master: 'ally', target: world.player, allies: 7 });
  expect(behavior.behaviorTarget).toEqual({ master: 'enemy', target: ally, allies: 8 });
});
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
  expect(owner.guns.map((g) => g.targeting!.target?.uid)).toEqual([ally.uid, world.player.uid]);
  for (const gun of owner.guns) gun.targeting!.allies = 1;
  tickGuns(world, owner, emptyInput());
  expect(owner.guns.map((g) => g.angle)).toEqual([90, 0]);
  expect(owner.guns[0].targeting).not.toBe(owner.guns[1].targeting);
});
test('ally-count retargeting follows Aim, so a ready shot keeps the preceding target angle', () => {
  const { world, ally, owner, gun } = scenario();
  gun.targeting = { master: 'enemy', target: ally, allies: 0 };
  gun.counter = WEAPONS[4001].rate - 1;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting.target?.uid).toBe(world.player.uid);
  expect(world.bullets[0].angle).toBe(90);
  expect(world.bullets[0].targetId).toBeNull();
  gun.counter = WEAPONS[4001].rate - 1;
  tickGuns(world, owner, emptyInput());
  expect(world.bullets[1].angle).toBe(0);
});
test('an inclusive ally-index miss can occur twice without advancing the weapon timer', () => {
  const { world, owner, gun } = scenario();
  gun.targeting!.target = null;
  gun.angle = 37;
  gun.counter = WEAPONS[4001].rate - 1;
  const values = [0, 0.99, 0, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting!.target).toBeNull();
  expect(gun.angle).toBe(37);
  expect(gun.counter).toBe(WEAPONS[4001].rate - 1);
  expect(world.bullets).toHaveLength(0);
  tickGuns(world, owner, emptyInput());
  expect(world.bullets).toHaveLength(1);
});
test('EnemyAim acquisition after a failed Run retry keeps the old angle even when its second retry succeeds', () => {
  const { world, owner, gun } = scenario();
  gun.targeting!.target = null;
  gun.angle = 37;
  gun.counter = WEAPONS[4001].rate - 1;
  const values = [0, 0.99, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  tickGuns(world, owner, emptyInput());
  expect(gun.targeting!.target as unknown).toBe(world.player);
  expect(gun.angle).toBe(37);
  expect(world.bullets[0].angle).toBe(37);
});
test('dead but attached targets remain referenced until the source parent detaches', () => {
  const { world, ally, owner, gun } = scenario();
  gun.targeting!.target = ally;
  ally.dead = true;
  tickGuns(world, owner, emptyInput());
  expect(gun.angle).toBe(90);
  expect(gun.targeting!.target?.uid).toBe(ally.uid);
  world.allies = [];
  world.actorParents.sync(world);
  tickGuns(world, owner, emptyInput());
  expect(gun.angle).toBe(0);
  expect(gun.targeting!.target as unknown).toBe(world.player);
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
  world.allies = [ally];
  world.actorParents.sync(world);
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

test('a retained target object is not replaced by a same-UID clip in another field', () => {
  const { world, ally, owner, gun } = scenario();
  gun.targeting!.target = ally;
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  next.enemies = [];
  world.runtimeFor(next).allies = [createTank(ally.uid, design([]), 'ally', 300, -200)];
  world.actorParents.sync(world);
  expect(weaponAimPoint(world, owner, gun)).toEqual({ x: 0, y: 100 });
  expect(gun.targeting!.target).toBe(ally);
});

test('target choice during travel reads the outgoing wrapper even for an incoming owner', () => {
  const { world, ally } = scenario([]);
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  next.enemies = [];
  const values = [0, 0];
  world.rng.next = () => values.shift() ?? 0.99;
  const incoming = createTank(world.nextId(), design([4001]), 'enemy', 10, 20, 100, 100, world);
  next.enemies = [incoming];
  incoming.guns[0].targeting!.allies = 1;
  world.actorParents.sync(world);
  expect(incoming.guns[0].targeting!.target).toBe(ally);
  // The incoming owner is never used as a reason to scan incoming allies.
  expect(weaponAimPoint(world, incoming, incoming.guns[0])).toEqual({ x: 0, y: 100 });
});

test('ally prediction uses base speed despite sticky, then clears a deactivated target before firing', () => {
  const { world, owner } = scenario([]);
  owner.x = 100;
  owner.y = 30;
  owner.rotation = 90;
  owner.design = { ...owner.design, speed: 2 };
  owner.status.sticky = 100;
  const ally = createTank(world.nextId(), design([7001]), 'ally', 0, 0, 100, 100, world);
  world.allies = [ally];
  world.actorParents.sync(world);
  const point = weaponAimPoint(world, ally, ally.guns[0]);
  expect(point!.y).toBe(72); // round(sqrt(200²+60²)/10)=21, two Scale calls.
  owner.status.stun = 1;
  expect(weaponAimPoint(world, ally, ally.guns[0])!.y).toBe(30);
  owner.dead = true;
  ally.guns[0].counter = WEAPONS[7001].rate - 1;
  tickGuns(world, ally, emptyInput());
  expect(ally.guns[0].targeting!.target).toBeNull();
  expect(ally.guns[0].counter).toBe(WEAPONS[7001].rate - 1);
  expect(world.bullets).toHaveLength(0);
});

test('primary Setup acquisition is interleaved with later behavior constructors', () => {
  const { world, ally } = scenario([]);
  const values = [0, 0, 0.4, 0.99];
  world.rng.next = () => values.shift() ?? 0.99;
  const owner = createTank(world.nextId(), design([4001, 6004]), 'enemy', 0, 0, 100, 100, world);
  expect(owner.guns[0].targeting!.target).toBe(ally);
  expect(owner.guns[1].phasing!.counter).toBe(20);
  expect(owner.guns[1].behaviorTarget!.target).toBe(world.player);
  expect(values).toHaveLength(0);
});
