import { importActorFixtures } from './fixtures/actor-attachments';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { Random } from '../src/game/core/math';
import { createTank } from '../src/game/simulation/tank';
import { createBehaviorTarget } from '../src/game/simulation/behavior-targets';
import { acquireHealerTarget, HealerTargetReadError } from '../src/game/simulation/healer-target';
import { healerPatient, tickHealer, tickHealingBeam } from '../src/game/simulation/healing';
import { World, emptyInput } from '../src/game/simulation/world';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { cacheEmptyField } from './fixtures/empty-field';
function actor(
  uid: number,
  side: 'ally' | 'enemy' | 'player' = 'ally',
  life = 100,
  painted = false,
) {
  return createTank(
    uid,
    {
      ...STARTER,
      avatar: side === 'player',
      speed: 0,
      life: 100,
      parts: painted ? [STARTER.parts[0]] : [],
    },
    side,
    0,
    0,
    100,
    life,
  );
}
function population() {
  const owner = actor(2),
    avatar = actor(1, 'player');
  return {
    owner,
    avatar,
    enemies: [actor(3, 'enemy'), actor(4, 'enemy', 20)],
    allies: [owner, actor(5, 'ally', 20)],
  };
}
function random(...draws: number[]) {
  const rng = new Random(1);
  let calls = 0;
  rng.next = () => {
    if (calls >= draws.length) throw new Error('extra draw');
    return draws[calls++];
  };
  return { rng, calls: () => calls };
}
function live(side: 'ally' | 'enemy' = 'enemy', paintedPatient = false) {
  const world = new World([], [], 1);
  world.progression.level = 6;
  world.rng.next = () => 0.5;
  const owner = createTank(
    100,
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      life: 100,
      parts: [{ ...STARTER.parts[1], x: 0, y: 0, type: 6002 }],
    },
    side,
    -100,
    0,
  );
  owner.movement.frames = 10;
  const patient = actor(101, side, 50, paintedPatient);
  patient.x = 100;
  world.field.enemies = side === 'enemy' ? [owner, patient] : [];
  importActorFixtures(world);
  world.allies = side === 'ally' ? [owner, patient] : [];
  importActorFixtures(world);
  world.field.cleared = false;
  world.actorParents.sync(world);
  return { world, owner, patient, gun: owner.guns[0] };
}

test('enemy Healer scans current-wrapper order, excluding itself without extra filters or draws', () => {
  const p = population(),
    state = createBehaviorTarget(),
    r = random();
  p.owner.side = 'enemy';
  p.owner.life = 1;
  const later = actor(6, 'enemy', 1);
  p.enemies = [p.owner, p.enemies[0], p.enemies[1], later];
  expect(acquireHealerTarget(state, p.owner, p, r.rng)).toBe(p.enemies[2]);
  expect(state.master).toBe('enemy');
  expect(r.calls()).toBe(0);
});

test('held target returns before master/population checks and does not alias a replacement UID', () => {
  const p = population(),
    state = createBehaviorTarget(),
    r = random();
  const target = p.enemies[1];
  state.target = target;
  state.master = 'enemy';
  p.enemies = [{ ...target }];
  target.dead = true;
  expect(acquireHealerTarget(state, p.owner, p, r.rng)).toBe(target);
  expect(state.master).toBe('enemy');
  expect(r.calls()).toBe(0);
});

test('allied Healer retains injured or overfull avatar without rolling; empty allies retain a full avatar', () => {
  for (const life of [99, 101, 100]) {
    const p = population(),
      state = createBehaviorTarget(),
      r = random();
    p.avatar.life = life;
    if (life === 100) p.allies = [];
    expect(acquireHealerTarget(state, p.owner, p, r.rng)).toBe(p.avatar);
    expect(r.calls()).toBe(0);
  }
});

test('allied scan excludes index zero and can retain the final self candidate', () => {
  const p = population(),
    state = createBehaviorTarget(),
    r = random(0, 0);
  p.allies = [p.allies[1], p.owner];
  p.owner.life = 10;
  expect(acquireHealerTarget(state, p.owner, p, r.rng)).toBe(p.owner);
  expect(r.calls()).toBe(2);
});

test('inclusive ally miss throws before assigning the patient, after sampling master and one draw', () => {
  const p = population(),
    state = createBehaviorTarget(),
    r = random(1);
  expect(() => acquireHealerTarget(state, p.owner, p, r.rng)).toThrow(HealerTargetReadError);
  expect(state.target).toBeNull();
  expect(state.master).toBe('ally');
  expect(r.calls()).toBe(1);
});

test('source selector wrapper does not bound the ally scan to valid injured candidates', () => {
  const { world, owner, patient, gun } = live('ally');
  world.player.life = world.player.maxLife;
  world.allies = [patient, owner];
  importActorFixtures(world);
  world.rng.next = () => 0;
  expect(healerPatient(world, owner, gun)!.uid).toBe(owner.uid);
  expect(gun.behaviorTarget!.target).toBe(owner);
});

test('source read aborts the remaining world frame while stage callbacks/artwork and later frames continue', () => {
  const { world, owner, patient, gun } = live('ally');
  world.player.life = world.player.maxLife;
  world.rng.next = () => 1;
  const stage = new StageRuntime(world.mainEffects);
  stage.random = () => 0.5;
  let callbacks = 0;
  stage.subscribe({ mainStep: () => world.step(emptyInput(), 0, false) });
  stage.subscribe({ step: () => callbacks++ });
  stage.advance(20, 50);
  expect([
    world.stats.frames,
    owner.age,
    patient.age,
    owner.artAge,
    patient.artAge,
    callbacks,
  ]).toEqual([1, 1, 0, 1, 1, 1]);
  expect(gun.behaviorTarget!.target).toBeNull();
  world.player.life--;
  stage.advance(20, 50);
  expect([world.stats.frames, owner.age, patient.age, callbacks]).toEqual([2, 2, 1, 2]);
  expect(gun.behaviorTarget!.target).toBe(world.player);
});

test('full-patient reacquisition retries its read error inside PartCallRun before frame abort', () => {
  const { world, owner, gun } = live('ally');
  world.allies = [owner];
  importActorFixtures(world);
  world.player.life = world.player.maxLife;
  gun.behaviorTarget!.target = world.player;
  gun.behaviorTarget!.master = 'ally';
  let reads = 0;
  const original = world.rng.int.bind(world.rng);
  world.rng.int = (a, b) => {
    if (a === 1 && b === 1) reads++;
    return original(a, b);
  };
  world.step(emptyInput());
  expect(reads).toBe(2);
  expect(gun.behaviorTarget!.target).toBeNull();
});

test('unrelated host errors are not swallowed by the source event-boundary adapter', () => {
  const { world } = live();
  world.actorParents.point = () => {
    throw new Error('unexpected host fault');
  };
  expect(() => world.step(emptyInput())).toThrow('unexpected host fault');
});

test('a retained overfull patient is not treated as source full-health equality', () => {
  const { world, owner, patient, gun } = live();
  healerPatient(world, owner, gun);
  patient.life = 101;
  gun.counter = 2;
  tickHealer(world, owner, gun);
  expect(world.bullets).toHaveLength(1);
  expect(world.bullets[0].healingTarget).toBe(patient);
});

test('missing beam parent uses its trigger to reacquire and waits another three active calls', () => {
  const { world, owner, patient, gun } = live();
  gun.beamId = 999;
  gun.counter = 2;
  tickHealer(world, owner, gun);
  expect(world.bullets).toHaveLength(0);
  expect(gun.beamId).toBeUndefined();
  expect(gun.behaviorTarget!.target).toBe(patient);
  tickHealer(world, owner, gun);
  tickHealer(world, owner, gun);
  expect(world.bullets).toHaveLength(0);
  tickHealer(world, owner, gun);
  expect(world.bullets).toHaveLength(1);
});

test('an acquisition read inside the missing-beam trigger retries through PartCallRun catch without resetting its timer', () => {
  const { world, owner, patient, gun } = live('ally');
  world.player.life = world.player.maxLife;
  gun.behaviorTarget!.target = patient;
  gun.behaviorTarget!.master = 'ally';
  gun.beamId = 999;
  gun.counter = 2;
  const values = [0.99, 0]; // First lookup reads index2; catch retry reads injured index1.
  world.rng.next = () => values.shift() ?? 0;
  tickHealer(world, owner, gun);
  expect(values).toHaveLength(0);
  expect(gun.behaviorTarget!.target).toBe(patient);
  expect(gun.counter).toBe(3);
  expect(world.bullets).toHaveLength(0);
  tickHealer(world, owner, gun);
  expect(gun.counter).toBe(0);
  expect(world.bullets).toHaveLength(1);
});

test('stopping removes a beam immediately even when the next acquisition aborts the frame', () => {
  const { world, owner, gun } = live('ally');
  world.player.life = world.player.maxLife - 1;
  world.step(emptyInput());
  world.step(emptyInput());
  world.step(emptyInput());
  expect(world.bullets).toHaveLength(1);
  world.player.life = world.player.maxLife;
  world.allies = [owner];
  importActorFixtures(world);
  world.step(emptyInput());
  expect(world.bullets).toHaveLength(0);
  expect(gun.beamId).toBeUndefined();
});

test('beam retains a direct patient and projects its parent independently of roster UID lookup', () => {
  const { world, owner, patient, gun } = live('enemy', true);
  gun.counter = 2;
  tickHealer(world, owner, gun);
  const beam = world.bullets[0];
  beam.contactFrames = 10;
  const oldLookup = world.allTanks.bind(world);
  world.allTanks = () => oldLookup().filter((t) => t !== patient);
  world.hitTest = (target) => target === patient;
  tickHealingBeam(world, beam, owner);
  expect(patient.life).toBe(51);
  expect(beam.dead).toBe(false);
});

test('range includes the 400px squared boundary and a failed range check retains its fire counter', () => {
  for (const distance of [400, 400.05]) {
    const { world, owner, patient, gun } = live();
    world.muzzle = () => ({ x: 0, y: 0 });
    patient.x = distance;
    gun.counter = 2;
    tickHealer(world, owner, gun);
    expect(world.bullets).toHaveLength(distance === 400 ? 1 : 0);
    if (distance > 400) {
      expect(gun.counter).toBe(2);
      patient.x = 399;
      tickHealer(world, owner, gun);
      expect(world.bullets).toHaveLength(1);
    }
  }
});

test('factory runs Healer Setup acquisition before its first active frame', () => {
  const { world, patient, owner } = live();
  const fresh = createTank(102, owner.design, 'enemy', 0, 0, undefined, undefined, world);
  expect(fresh.guns[0].behaviorTarget!.target).toBe(patient);
  expect(fresh.guns[0].behaviorTarget!.master).toBe('enemy');
  expect(fresh.guns[0].counter).toBe(0);
});

test('incoming Healer Setup and active reselection use the current wrapper and project the held patient', () => {
  const { world, owner, patient } = live();
  cacheEmptyField(world);
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  world.transit!.offset = { x: 800, y: 0 };
  const incoming = createTank(102, owner.design, 'enemy', 0, 0, undefined, undefined, world);
  world.transit!.next.enemies = [incoming];
  importActorFixtures(world);
  expect(incoming.guns[0].behaviorTarget!.target).toBe(patient);
  world.step(emptyInput());
  expect(incoming.movement.swarmPoint).toEqual({ x: -700, y: 0 });
  expect(incoming.guns[0].counter).toBe(0); // Range rejection reacquires, without advancing its timer.
});
