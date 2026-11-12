import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank, healTank } from '../src/game/simulation/tank';
import { tickHealer } from '../src/game/simulation/healing';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { createBehaviorTarget } from '../src/game/simulation/behavior-targets';
import { acquireHealerTarget, HealerTargetReadError } from '../src/game/simulation/healer-target';
import type { Projectile } from '../src/game/core/types';

const design = {
  ...STARTER,
  avatar: false,
  speed: 0,
  life: 100,
  reward: 0,
  parts: [STARTER.parts[0]],
};
const healer = {
  ...design,
  parts: [...design.parts, { ...STARTER.parts[1], type: 6002, x: 0, y: 0 }],
};
function setup() {
  const world = new World([], [], 19);
  world.rng.next = () => 0.5;
  world.progression.level = 6;
  world.field.cleared = false;
  return world;
}
function shell(world: World, values: Partial<Projectile> = {}): Projectile {
  return {
    uid: world.nextId(),
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    x: 100,
    y: 0,
    angle: 0,
    heading: 0,
    speed: 0,
    damage: 2,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: null,
    hit: new Set(),
    dead: false,
    symbol: 1721,
    orbit: 0,
    ...values,
  };
}
function stageFor(world: World) {
  const stage = new StageRuntime(world.mainEffects);
  stage.random = () => 0.5;
  let callbacks = 0;
  stage.subscribe({ step: () => world.step(emptyInput(), 0, false) });
  stage.subscribe({ step: () => callbacks++ });
  return { advance: () => stage.advance(20, 50), callbacks: () => callbacks };
}

test('queued outgoing patient data aborts the incoming Healer catch retry, while stage frames recover', () => {
  const world = setup();
  const outgoing = world.field;
  const patient = createTank(world.nextId(), design, 'enemy', 350, 0, 100, 1);
  outgoing.enemies = [patient];
  const owner = createTank(world.nextId(), healer, 'enemy', -250, 0, 100, 100, world);
  const gun = owner.guns.find((gun) => gun.part.type === 6002)!;
  owner.rotation = 30;
  gun.counter = 2;
  const sentinel = createTank(world.nextId(), design, 'enemy', -100, 150);
  world.fields.set('1,0', {
    col: 1,
    row: 0,
    scale: 1,
    boss: false,
    cleared: false,
    tutorial: 0,
    enemies: [owner, sentinel],
  });
  world.cache.store(world.fields.get('1,0')!);
  world.addBullet(shell(world, { x: 350 }));
  world.hitTest = (tank) => tank === patient;
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  const stage = stageFor(world);
  world.hitSoundTimer = 4;
  stage.advance();
  expect(world.hitSoundTimer).toBe(4); // The aborted World.Run never reaches its sound-clock tail.
  expect(patient.dead).toBe(true);
  expect(world.runtimeFor(outgoing).enemyRemovals).toContain(patient);
  expect(world.actorParents.hasParent(patient)).toBe(true);
  expect(gun.behaviorTarget!.target).toBeNull();
  expect([owner.age, sentinel.age, owner.artAge, sentinel.artAge, stage.callbacks()]).toEqual([
    1, 0, 1, 1, 1,
  ]);
  expect(gun.counter).toBe(2);
  expect(gun.angle).toBe(150); // Aim happened before the protected data read failed.
  expect(world.currentWrapper).toBe(outgoing);
  stage.advance();
  expect(world.hitSoundTimer).toBe(3);
  expect(world.actorParents.hasParent(patient)).toBe(false);
  expect(outgoing.enemies).not.toContain(patient);
  expect([owner.age, sentinel.age, stage.callbacks()]).toEqual([2, 1, 2]);
});

test('a queued dead patient has an empty display, so its beam retains contact count without AddLife', () => {
  const world = setup();
  const owner = createTank(world.nextId(), design, 'enemy');
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 1);
  world.field.enemies = [owner, patient];
  const killer = shell(world);
  const beam = shell(world, {
    owner: owner.uid,
    enemy: true,
    kind: 'healBeam',
    damage: 1,
    radius: 0,
    symbol: 2015,
    healingTarget: patient,
    targetId: patient.uid,
    contactFrames: 10,
  });
  const sentinel = shell(world, { enemy: true, x: -300, y: 100, damage: 0 });
  for (const bullet of [killer, beam, sentinel]) world.addBullet(bullet);
  world.hitTest = (tank) => tank === patient;
  const stage = stageFor(world);
  stage.advance();
  expect(patient.dead).toBe(true);
  expect(patient.life).toBe(0);
  expect(patient.displayChildren).toEqual([]);
  expect(world.actorParents.hasParent(patient)).toBe(true);
  expect([beam.contactFrames, sentinel.age, world.player.age, stage.callbacks()]).toEqual([
    10, 1, 1, 1,
  ]);
  stage.advance();
  expect(world.actorParents.hasParent(patient)).toBe(false);
  expect(world.bullets).not.toContain(beam);
  // Source RemoveBullet splices the live array: its next old entry waits one more frame.
  expect([sentinel.age, world.player.age, stage.callbacks()]).toEqual([1, 2, 2]);
  stage.advance();
  expect([sentinel.age, world.player.age, stage.callbacks()]).toEqual([2, 3, 3]);
});

for (const mode of ['healthy', 'killed', 'jammed'] as const)
  test(`an existing beam keeps its direct home through ${mode} owner state until actual detach`, () => {
    const world = setup();
    const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 50);
    world.field.enemies = [patient];
    const owner = createTank(
      world.nextId(),
      healer,
      'enemy',
      0,
      0,
      100,
      mode === 'killed' ? 1 : 100,
      world,
    );
    world.field.enemies = [owner, patient];
    world.actorParents.sync(world);
    world.muzzle = () => ({ x: 0, y: 0 });
    world.hitTest = (tank) => tank === owner || tank === patient;
    if (mode === 'killed') world.addBullet(shell(world, { x: 0 }));
    const gun = owner.guns.find((gun) => gun.part.type === 6002)!;
    gun.counter = 2;
    tickHealer(world, owner, gun);
    const beam = world.bullets.find((bullet) => bullet.kind === 'healBeam')!;
    beam.contactFrames = 10;
    if (mode === 'jammed') owner.status.jam = 3;
    world.step(emptyInput());
    expect(owner.dead).toBe(mode === 'killed');
    expect(world.actorParents.hasParent(owner)).toBe(true);
    expect(patient.life).toBe(51);
    expect(beam.contactFrames).toBe(0);
    expect(world.bullets).toContain(beam);
    if (mode === 'jammed') {
      expect(owner.status.jam).toBe(2);
      expect(gun.counter).toBe(0);
    }
    if (mode === 'killed') {
      expect(gun.behaviorTarget!.target).toBeNull();
      expect(beam.healingTarget).toBe(patient);
      expect(beam.healingHome).toBe(owner);
      world.step(emptyInput());
      expect(world.actorParents.hasParent(owner)).toBe(false);
      expect(world.bullets).not.toContain(beam);
    }
  });

test('raw acquisition reads deactivated NPC data instead of filtering it, while held references return first', () => {
  const world = setup();
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 1);
  const owner = createTank(world.nextId(), design, 'enemy');
  world.field.enemies = [patient, owner];
  world.actorParents.sync(world);
  world.damage(patient, 2);
  const state = createBehaviorTarget();
  const population = { avatar: world.player, enemies: world.field.enemies, allies: [] };
  expect(() => acquireHealerTarget(state, owner, population, world.rng)).toThrow(
    HealerTargetReadError,
  );
  state.target = patient;
  expect(acquireHealerTarget(state, owner, population, world.rng)).toBe(patient);
  expect(patient.maxLife).toBe(100); // Immutable rendering metadata survives simulation data teardown.
});

test('direct AddLife on deactivated NPC increments before failure without restoring parts or debt', () => {
  const world = setup();
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 1);
  world.field.enemies = [patient];
  world.damage(patient, 2);
  patient.hiddenParts.add(design.parts[0].key);
  const debt = patient.degradation.debt;
  expect(() => healTank(patient, 1)).toThrow(HealerTargetReadError);
  expect(patient.life).toBe(1);
  expect(patient.hiddenParts.has(design.parts[0].key)).toBe(true);
  expect(patient.degradation.debt).toBe(debt);
});

test('lethal avatar life does not clear its data or prevent AddLife', () => {
  const world = setup();
  world.player.life = 0;
  const owner = createTank(world.nextId(), healer, 'ally');
  const state = createBehaviorTarget();
  expect(
    acquireHealerTarget(state, owner, { avatar: world.player, enemies: [], allies: [] }, world.rng),
  ).toBe(world.player);
  healTank(world.player, 1);
  expect(world.player.life).toBe(1);
  expect(world.player.dataActive).toBe(true);
});

test('AddLife preserves its signed int property assignment without deactivating on overflow', () => {
  const tank = createTank(90, design, 'enemy', 0, 0, 2147483647, 2147483647);
  healTank(tank, 1);
  expect(tank.life).toBe(-2147483648);
  expect(tank.dead).toBe(false);
  expect(tank.dataActive).toBe(true);
});

test('primary final callbacks see live data before the owning field receives deactivation', () => {
  const world = setup();
  const owner = createTank(
    world.nextId(),
    { ...design, parts: [...design.parts, { ...STARTER.parts[1], type: 4022 }] },
    'enemy',
  );
  world.field.enemies = [owner];
  const observed: { active: boolean; queued: boolean }[] = [];
  const add = world.addBullet.bind(world);
  world.addBullet = (bullet, home, target) => {
    observed.push({
      active: owner.dataActive,
      queued: world.runtimeFor(world.field).enemyRemovals.includes(owner),
    });
    return add(bullet, home, target);
  };
  world.damage(owner, 100);
  expect(observed).toHaveLength(6);
  expect(observed.every((state) => state.active && !state.queued)).toBe(true);
  expect(owner.dataActive).toBe(false);
  expect(world.runtimeFor(world.field).enemyRemovals).toContain(owner);
});

test('an allied boundary exit empties its still-parented display before healing contact', () => {
  const world = setup();
  const owner = createTank(world.nextId(), design, 'enemy', 400, 0);
  const patient = createTank(world.nextId(), design, 'ally', 414, 0, 100, 50);
  world.field.enemies = [owner];
  world.allies = [patient];
  const beam = shell(world, {
    owner: owner.uid,
    enemy: true,
    kind: 'healBeam',
    x: 400,
    damage: 1,
    radius: 0,
    symbol: 2015,
    healingTarget: patient,
    targetId: patient.uid,
    contactFrames: 10,
  });
  world.addBullet(beam);
  world.hitTest = (tank) => tank === patient;
  world.step(emptyInput());
  expect(patient.dead).toBe(true);
  expect(patient.dataActive).toBe(false);
  expect(patient.life).toBe(0);
  expect(patient.displayChildren).toEqual([]);
  expect(world.actorParents.hasParent(patient)).toBe(true);
  expect([beam.contactFrames, world.player.age]).toEqual([10, 1]);
  world.step(emptyInput());
  expect(world.actorParents.hasParent(patient)).toBe(false);
  expect(world.bullets).not.toContain(beam);
});

test('a born healing beam does not resolve its home or patient through active UID lookup', () => {
  const world = setup();
  const owner = createTank(world.nextId(), design, 'enemy');
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 50);
  world.field.enemies = [owner, patient];
  const beam = shell(world, {
    owner: owner.uid,
    enemy: true,
    kind: 'healBeam',
    damage: 1,
    radius: 0,
    symbol: 2015,
    healingTarget: patient,
    targetId: patient.uid,
    contactFrames: 10,
  });
  world.addBullet(beam);
  world.hitTest = (tank) => tank === patient;
  world.allTanks = () => {
    throw new Error('active UID lookup must not replace direct beam references');
  };
  world.step(emptyInput());
  expect(patient.life).toBe(51);
  expect(beam.healingHome).toBe(owner);
});

test('a host collision failure still escapes the scoped source listener boundary', () => {
  const world = setup();
  const owner = createTank(world.nextId(), design, 'enemy');
  const patient = createTank(world.nextId(), design, 'enemy', 100, 0, 100, 50);
  world.field.enemies = [owner, patient];
  world.addBullet(
    shell(world, {
      owner: owner.uid,
      enemy: true,
      kind: 'healBeam',
      damage: 1,
      radius: 0,
      symbol: 2015,
      healingTarget: patient,
      targetId: patient.uid,
      contactFrames: 10,
    }),
  );
  world.hitTest = () => {
    throw new Error('unrelated native collision fault');
  };
  expect(() => world.step(emptyInput())).toThrow('unrelated native collision fault');
  expect(patient.life).toBe(50);
});
