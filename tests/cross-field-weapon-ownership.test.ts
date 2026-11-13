import { expect, test } from 'bun:test';
import { STARTER, ENEMIES, BOSSES } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { tickHealer } from '../src/game/simulation/healing';
import type { Field, TankDesign } from '../src/game/core/types';

const still = (design: TankDesign): TankDesign => ({ ...design, speed: 0, reward: 0 });
const patientDesign = still({ ...STARTER, avatar: false, life: 1000, parts: [STARTER.parts[0]] });
function setup() {
  const world = new World([], [], 19);
  world.rng.next = () => 0.5;
  world.player.life = 40;
  world.hitTest = () => false;
  return world;
}
function arrive(world: World) {
  const transit = world.transit!;
  world.player.x = transit.target.x;
  world.player.y = transit.target.y;
  world.step(emptyInput());
  expect(world.transit).toBeNull();
}
function preload(world: World, col: number, enemies: Field['enemies']) {
  const field: Field = { col, row: 0, scale: 1, boss: false, cleared: false, tutorial: 0, enemies };
  world.fields.set(`${col},0`, field);
  world.cache.store(field);
  return field;
}
function cachedHealer() {
  const world = setup(),
    original = world.field;
  const source = ENEMIES.find((t) => t.parts.some((p) => p.type === 6002))!;
  expect(source).toBeDefined();
  const patient = createTank(world.nextId(), patientDesign, 'enemy', 50, 0, 1000, 10, world);
  const owner = createTank(
    world.nextId(),
    still(source),
    'enemy',
    -50,
    0,
    undefined,
    undefined,
    world,
  );
  original.enemies = [patient, owner];
  world.attachActor(patient, original);
  world.attachActor(owner, original);
  world.actorParents.sync(world);
  world.muzzle = () => ({ x: 0, y: 0 }); // Fixed emitter isolates wrapper translation from mount transforms.
  const gun = owner.guns.find((g) => g.part.type === 6002)!;
  gun.counter = 2;
  tickHealer(world, owner, gun);
  const beam = world.bullets[0];
  expect(beam.kind).toBe('healBeam');
  const oldRuntime = world.runtimeFor(original);
  const sentinel = createTank(world.nextId(), patientDesign, 'enemy', 150, 0, 1000, 1000, world);
  preload(world, 1, [sentinel]);
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  arrive(world);
  expect(oldRuntime.bullets).toContain(beam);
  world.player.x = -425;
  world.jump({ x: -1, y: 0 });
  const incoming = world.transit!.next;
  expect(incoming).not.toBe(original);
  expect(incoming.enemies).toContain(owner);
  const offset = { ...world.transit!.offset };
  gun.counter = 2;
  return { world, patient, owner, gun, beam, oldRuntime, original, incoming, offset };
}

test('revisited Healer retains the old parented beam and updates it in outgoing coordinates', () => {
  const { world, patient, gun, beam, oldRuntime, incoming, offset } = cachedHealer();
  world.step(emptyInput());
  expect(world.transit).not.toBeNull();
  expect(gun.beamId).toBe(beam.uid);
  expect(gun.behaviorTarget!.target).toBe(patient);
  expect(gun.patientId).toBe(patient.uid);
  expect(oldRuntime.bullets).toContain(beam);
  expect(world.runtimeFor(incoming).bullets).toHaveLength(0);
  expect([beam.x, beam.y]).toEqual([offset.x, offset.y]);
  expect(gun.counter).toBe(0);
});

test('incoming builtin boss spawner appends to outgoing layer after its actor pass', () => {
  const world = setup(),
    outgoing = world.currentWrapper;
  outgoing.enemies = [createTank(world.nextId(), patientDesign, 'enemy', 0, 0, 1000, 1000, world)];
  const boss = createTank(
    world.nextId(),
    still(BOSSES[0]),
    'enemy',
    20,
    30,
    undefined,
    undefined,
    world,
  );
  const spawners = boss.guns.filter((g) => g.part.type === 4003);
  expect(spawners).toHaveLength(2);
  for (const gun of boss.guns) gun.counter = -100000;
  spawners[0].counter = 199;
  spawners[0].spawnDesign = ENEMIES.find((t) => t.name === 'Pew Pew') ?? ENEMIES[0];
  preload(world, 1, [boss]);
  world.muzzle = () => ({ x: 17, y: 23 });
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const incoming = world.transit!.next,
    offset = { ...world.transit!.offset };
  world.step(emptyInput());
  expect(world.transit).not.toBeNull();
  expect(outgoing.enemies).toHaveLength(2);
  expect(incoming.enemies).toEqual([boss]);
  const newborn = outgoing.enemies[1];
  expect(newborn.design).toEqual(spawners[0].spawnDesign);
  expect([newborn.x, newborn.y]).toEqual([17 + offset.x, 23 + offset.y]);
  expect(newborn.age).toBe(0);
  expect(world.actorParents.inField(newborn, outgoing)).toBe(true);
});

test('StopFiring preserves an old-layer beam when the current wrapper cannot remove it', () => {
  const { world, patient, gun, beam, oldRuntime } = cachedHealer();
  world.step(emptyInput());
  expect(gun.beamRef).toBe(beam);
  patient.life = patient.maxLife;
  world.step(emptyInput());
  expect(gun.beamRef).toBeUndefined();
  expect(gun.beamId).toBeUndefined();
  expect(oldRuntime.bullets).toContain(beam);
  expect(world.hasBulletParent(beam)).toBe(true);
  expect(beam.dead).toBe(false);
});

test('removing the actual parent clears the cached beam only on its next ready trigger', () => {
  const { world, gun, beam, oldRuntime, original } = cachedHealer();
  // Simulate old owning-layer RemoveBullet, distinct from current-wrapper StopFiring.
  expect(world.removeBullet(beam, original)).toBe(true);
  expect(oldRuntime.bullets).not.toContain(beam);
  expect(world.hasBulletParent(beam)).toBe(false);
  gun.counter = 0;
  world.step(emptyInput());
  expect(gun.beamRef).toBe(beam);
  expect(gun.counter).toBe(1);
  gun.counter = 2;
  world.step(emptyInput());
  expect(gun.beamRef).toBeUndefined();
  expect(gun.beamId).toBeUndefined();
  expect(gun.counter).toBe(0);
});
