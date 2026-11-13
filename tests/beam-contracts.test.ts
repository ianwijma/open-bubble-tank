import { setFieldFixtureLayout } from '../tools/fixtures/field-layout';
import { importAvatarFixture } from '../tools/fixtures/avatar-attachments';
import { importActorFixtures } from './fixtures/actor-attachments';
import { expect, test } from 'bun:test';
import type { TankDesign } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { tickDamageBeam } from '../src/game/simulation/beams';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

const body = { ...STARTER.parts[0], x: 0, y: 0 };
const design: TankDesign = {
  ...STARTER,
  avatar: false,
  speed: 0,
  reward: 0,
  life: 100,
  parts: [body],
};
function setup() {
  const world = new World([], [], 31);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [body, { ...STARTER.parts[1], type: 2017, x: 0, y: 0 }],
    },
    'player',
    0,
    0,
    50,
    40,
  );
  importAvatarFixture(world);
  world.field.cleared = false;
  world.field.tutorial = 0;
  world.muzzle = () => ({ x: 0, y: 0 });
  world.actorParents.sync(world);
  return world;
}
function enemy(world: World, x: number, y = 0, carrier = false) {
  const tank = createTank(
    world.nextId(),
    carrier
      ? {
          ...design,
          parts: [body, { ...STARTER.parts[1], key: 'carrier', type: 4013, x: 0, y: 0 }],
        }
      : design,
    'enemy',
    x,
    y,
  );
  tank.radius = 20;
  world.field.enemies.push(tank);
  importActorFixtures(world);
  world.actorParents.attach(tank, world.field);
  return tank;
}
function fire(world: World) {
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  return world.bullets.find((bullet) => bullet.kind === 'beam')!;
}

test('an earlier real shell leaves a queued empty enemy on the beam shared grid until next field Run', () => {
  const world = setup(),
    victim = enemy(world, 50),
    healthy = enemy(world, 100);
  victim.life = 1;
  const killer = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 50,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
  });
  world.addBullet(killer);
  const beam = fire(world);
  const hits: number[] = [];
  const hitTest = world.hitTest;
  world.hitTest = (tank, x, y) => {
    if (tank === healthy && victim.dead) hits.push(x);
    return hitTest(tank, x, y);
  };
  world.step({ ...emptyInput(), fire: true });
  expect(victim.dead).toBe(true);
  expect(victim.dataActive).toBe(false);
  expect(victim.displayChildren).toEqual([]);
  expect(world.field.enemies).toEqual([victim, healthy]);
  expect(world.actorParents.hasParent(victim)).toBe(true);
  expect(world.runtimeFor(world.field).enemyRemovals).toEqual([victim]);
  expect(hits[0]).toBe(30); // int(50 - 20); dead filtering instead starts at80.
  expect(beam.contactFrames).toBe(1);
  expect(healthy.life).toBe(100);
  hits.length = 0;
  world.step({ ...emptyInput(), fire: true });
  expect(world.field.enemies).toEqual([healthy]);
  expect(world.actorParents.hasParent(victim)).toBe(false);
  expect(hits[0]).toBe(80);
  expect(healthy.life).toBe(99);
});

test('filtered contact uses raw enemy index for carriers and damages the filtered actor', () => {
  const world = setup(),
    excluded = enemy(world, -100),
    carrier = enemy(world, 100, 0, true);
  const beam = fire(world);
  world.hitTest = (tank, x) => tank === carrier && x === 80;
  world.hitPart = () => true;
  tickDamageBeam(world, beam, world.field.enemies);
  expect(carrier.guns).toHaveLength(1); // raw[0] is excluded and has no carrier refs.
  expect(beam.contactFrames).toBe(1);
  tickDamageBeam(world, beam, world.field.enemies);
  expect([excluded.life, carrier.life]).toEqual([100, 99]);
  expect(world.bullets).toEqual([beam]);
});

test('raw-index carrier hit dispatches its own mount without incrementing beam contact', () => {
  const world = setup(),
    raw = enemy(world, -100, 0, true),
    contact = enemy(world, 100);
  const beam = fire(world),
    gun = raw.guns[0];
  world.hitTest = (tank, x) => tank === contact && x === 80;
  world.hitPart = (tank, part, x) => tank === raw && part === gun.part && x === 80;
  beam.contactFrames = 1;
  tickDamageBeam(world, beam, world.field.enemies);
  expect(raw.removedParts.has(gun.part.key)).toBe(true);
  expect(raw.guns).toEqual([]);
  expect(beam.contactFrames).toBe(1);
  expect(contact.life).toBe(100);
  expect(world.bullets.filter((bullet) => bullet.kind === 'seeker')).toHaveLength(6);
});

test('carrier primary membership is removed before its six triggers, while its display survives until afterward', () => {
  const world = setup(),
    carrier = enemy(world, 100, 0, true),
    gun = carrier.guns[0];
  const beam = fire(world),
    phases: boolean[][] = [];
  world.hitTest = (tank, x) => tank === carrier && x === 80;
  world.hitPart = () => true;
  const add = world.addBullet.bind(world);
  world.addBullet = (bullet, ...args) => {
    phases.push([
      carrier.guns.includes(gun),
      carrier.displayChildren.includes(`part:${gun.part.key}`),
    ]);
    return add(bullet, ...args);
  };
  tickDamageBeam(world, beam, world.field.enemies);
  expect(phases).toEqual(Array.from({ length: 6 }, () => [false, true]));
  expect(carrier.displayChildren).not.toContain(`part:${gun.part.key}`);
});

test('beam candidate Points follow actual reparented actors and contact converts back to tank coordinates', () => {
  const world = setup(),
    target = enemy(world, 100);
  const beam = fire(world);
  world.player.x = 425;
  setFieldFixtureLayout(world);
  world.jump({ x: 1, y: 0 }, false, { finalizeParts: false });
  const next = world.transit!.next;
  next.enemies = [target];
  world.actorParents.attach(target, next);
  world.actorParents.sync(world);
  // Old raw array still refers to target, but its actual parent is the incoming layer.
  expect(world.currentWrapper.enemies).toEqual([target]);
  expect(world.actorParents.inField(target, next)).toBe(true);
  const points: number[] = [];
  world.hitTest = (_tank, x) => {
    points.push(x);
    return true;
  };
  tickDamageBeam(world, beam, world.currentWrapper.enemies);
  expect(beam.contactFrames ?? 0).toBe(0); // target is now beyond the outgoing wall.
  expect(points).toEqual([]);
});

test('beam uses global Number subtraction after Point conversion and paints before damage', () => {
  const world = setup(),
    target = enemy(world, 100.079, -20.149);
  const beam = fire(world);
  beam.x = 0.079;
  beam.y = 0.149;
  beam.contactFrames = 1;
  const origin = world.bulletGlobal(beam)!;
  const point = world.actorParents.localToGlobal(target, { x: 0, y: 0 });
  const dx = point.x - origin.x,
    dy = point.y - origin.y;
  const first = (Math.sqrt(dx * dx + dy * dy) - target.radius) | 0;
  const samples: { x: number; y: number }[] = [];
  world.hitTest = (_tank, x, y) => {
    samples.push({ x, y });
    return true;
  };
  let during: unknown;
  world.damage = (tank) => {
    during = [tank, beam.beamLength, beam.contactFrames];
  };
  tickDamageBeam(world, beam, [target]);
  expect(samples).toEqual([
    { x: origin.x + first - point.x + target.x, y: origin.y - point.y + target.y },
  ]);
  expect(during).toEqual([target, first, 2]);
  expect(beam.contactFrames).toBe(0);
  expect(beam.speed).toBe(0);
});

test('a detached maintained avatar beam is updated directly until StopFiring releases its ref', () => {
  const world = setup(),
    beam = fire(world),
    gun = world.player.guns[0];
  expect(world.removeBullet(beam)).toBe(true);
  world.muzzle = () => ({ x: 10.079, y: 20.149 });
  world.fireGun(world.player, gun, emptyInput());
  expect(world.bullets).toEqual([]);
  expect([beam.x, beam.y]).toEqual([10.05, 20.1]);
  expect(gun.beamRef).toBe(beam);
  world.stopPrimaryFire();
  expect(gun.beamRef).toBeUndefined();
  expect(fire(world)).not.toBe(beam);
});

test('level-zero escape still triggers a retained unparented beam; arrival does not replace it', () => {
  const world = setup(),
    gun = world.player.guns[0];
  world.player.life = 1;
  world.damage(world.player, 2);
  expect(world.transit?.stopShoot).toBe(false);
  world.step({ ...emptyInput(), fire: true });
  const rejected = gun.beamRef;
  expect(rejected).toBeDefined();
  expect(world.bullets).toEqual([]);
  expect(world.hasBulletParent(rejected!)).toBe(false);
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step({ ...emptyInput(), fire: true });
  expect(world.transit).toBeNull();
  world.step({ ...emptyInput(), fire: true });
  expect(gun.beamRef).toBe(rejected);
  expect(world.bullets).toEqual([]);
  world.step(emptyInput());
  world.step({ ...emptyInput(), fire: true });
  expect(gun.beamRef).not.toBe(rejected);
  expect(world.bullets.some((bullet) => bullet.kind === 'beam')).toBe(true);
});

test('after a real death crossing StopFiring preserves the old detached wrapper beam', () => {
  const world = setup(),
    beam = fire(world),
    gun = world.player.guns[0];
  const original = world.currentWrapper;
  enemy(world, -100);
  world.player.life = 1;
  world.damage(world.player, 2);
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step({ ...emptyInput(), fire: true });
  expect(world.transit).toBeNull();
  expect(world.currentWrapper).not.toBe(original);
  expect(gun.beamRef).toBe(beam);
  world.stopPrimaryFire();
  expect(gun.beamRef).toBeUndefined();
  expect(world.runtimeFor(original).bullets).toEqual([beam]);
  expect(world.hasBulletParent(beam)).toBe(true);
  expect(beam.dead).toBe(false);
});
