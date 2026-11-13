import { importActorFixtures } from './fixtures/actor-attachments';
import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { tickGuns } from '../src/game/simulation/weapons';
import { STARTER } from '../src/game/data/catalog';

function run(world: World, owner: ReturnType<typeof createTank>) {
  world.actorParents.sync(world);
  tickGuns(world, owner, emptyInput());
}
function setup() {
  const world = new World([], [], 3),
    owner = createTank(
      world.nextId(),
      {
        ...STARTER,
        id: 'E-spike',
        avatar: false,
        speed: 0,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4026, rotation: 0 }],
      },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    ),
    gun = owner.guns[0];
  world.field.enemies = [owner];
  importActorFixtures(world);
  world.player.life = 40;
  world.player.radius = 0.1;
  Object.assign(world.player, world.muzzle(owner, gun, 13, 6));
  return { world, owner, gun };
}
test('Spike samples all seven authored emitters and records a hit immediately without a weapon timer or target', () => {
  const { world, owner, gun } = setup();
  const points: number[][] = [];
  world.hitTest = (t, x, y) => {
    points.push([x, y]);
    return Math.hypot(x - t.x, y - t.y) < 0.01;
  };
  run(world, owner);
  expect(points).toHaveLength(7);
  expect(world.player.life).toBe(37);
  expect(world.player.velocity).toEqual({ x: 7, y: 0 });
  expect(gun.targeting!.target).toBeNull();
  expect(gun.counter).toBe(0);
  expect(gun.spikeContacts).toEqual([{ target: world.player, remaining: 15 }]);
});
test('Spike applies its source15-call contact memory and still pushes through protection', () => {
  const { world, owner, gun } = setup();
  world.player.shield = 100;
  world.hitTest = () => true;
  run(world, owner);
  expect(world.player.life).toBe(40);
  expect(world.player.velocity.x).toBe(7);
  for (let i = 0; i < 14; i++) run(world, owner);
  expect(world.player.velocity.x).toBe(7);
  run(world, owner);
  expect(world.player.velocity.x).toBe(14);
  expect(gun.spikeContacts![0].remaining).toBe(15);
});
test('a remembered earlier ally stops the source candidate loop, then a later ally receives replacement force after expiry', () => {
  const { world, owner, gun } = setup();
  const first = createTank(world.nextId(), { ...STARTER, avatar: false, life: 100 }, 'ally', 0, 0),
    second = createTank(
      world.nextId(),
      { ...STARTER, avatar: false, life: 100, classId: 2 },
      'ally',
      0,
      0,
    );
  world.allies = [first, second];
  importActorFixtures(world);
  gun.spikeContacts = [{ target: first, remaining: 2 }];
  let probes = 0;
  world.hitTest = (t) => {
    probes++;
    return t === second;
  };
  run(world, owner);
  expect(probes).toBe(0);
  second.velocity = { x: -100, y: 30 };
  run(world, owner);
  expect(second.life).toBe(second.maxLife - 3);
  expect(second.velocity).toEqual({ x: 12, y: 0 });
  expect(world.player.life).toBe(40);
});
test('the global radial broad-phase gate can reject a contact before pixel testing', () => {
  const { world, owner } = setup();
  world.player.x = world.player.y = 0;
  owner.x = -275;
  owner.y = -225;
  let probes = 0;
  world.hitTest = () => {
    probes++;
    return true;
  };
  run(world, owner);
  expect(probes).toBe(0);
  expect(world.player.life).toBe(40);
});
test('Spike direct PartCallTrigger is empty; contact belongs to BehaviorRun', () => {
  const { world, owner, gun } = setup();
  world.hitTest = () => true;
  world.fireGun(owner, gun, emptyInput());
  expect(world.player.life).toBe(40);
  expect(world.bullets).toHaveLength(0);
});

test('a non-finite source radius fails the inclusive radial comparison before pixel testing', () => {
  const { world, owner } = setup();
  world.player.radius = NaN;
  let probes = 0;
  world.hitTest = () => {
    probes++;
    return true;
  };
  run(world, owner);
  expect(probes).toBe(0);
  expect(world.player.life).toBe(40);
});

test('Spike memory distinguishes a replacement clip with the same UID', () => {
  const { world, owner, gun } = setup();
  const first = createTank(99, { ...STARTER, avatar: false, life: 100 }, 'ally');
  const replacement = createTank(99, { ...STARTER, avatar: false, life: 100 }, 'ally');
  world.allies = [replacement];
  importActorFixtures(world);
  gun.spikeContacts = [{ target: first, remaining: 15 }];
  world.hitTest = (target) => target === replacement;
  run(world, owner);
  expect(first.life).toBe(100);
  expect(replacement.life).toBe(97);
  expect(gun.spikeContacts!.map((contact) => contact.target)).toEqual([first, replacement]);
});

test('Spike normalizes its unit direction before class scaling, retaining source floating-point order', () => {
  const { world, owner } = setup();
  owner.rotation = 3;
  world.player.radius = 100;
  world.hitTest = () => true;
  run(world, owner);
  expect(world.player.velocity).toEqual({ x: 6.990406743282018, y: 0.3663516937006069 });
});

test('Spike Setup and Run consume no ordinary target draws', () => {
  const world = new World([], [], 3);
  let draws = 0;
  world.rng.next = () => {
    draws++;
    return 0.5;
  };
  const owner = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [{ ...STARTER.parts[1], type: 4026 }],
    },
    'enemy',
    0,
    0,
    100,
    100,
    world,
  );
  world.field.enemies = [owner];
  importActorFixtures(world);
  world.allies = [createTank(99, { ...STARTER, avatar: false, parts: [] }, 'ally')];
  importActorFixtures(world);
  world.hitTest = () => false;
  run(world, owner);
  expect(draws).toBe(0);
  expect(owner.guns[0].targeting).toMatchObject({ master: 'enemy', target: null, allies: 1 });
});

test('lethal Spike contact aborts the source Run before force and memory, while later stage frames continue', () => {
  const { world, owner, gun } = setup();
  world.progression.level = 6;
  const victim = createTank(
    99,
    { ...STARTER, avatar: false, life: 3, speed: 0, parts: [] },
    'ally',
  );
  const sentinel = createTank(
    100,
    { ...STARTER, avatar: false, life: 100, speed: 0, parts: [] },
    'ally',
  );
  world.allies = [victim, sentinel];
  importActorFixtures(world);
  world.hitTest = (target) => target.side === 'ally';
  world.field.cleared = false;
  world.step(emptyInput());
  expect(victim.dead).toBe(true);
  expect(owner.age).toBe(1);
  expect(victim.velocity).toEqual({ x: 0, y: 0 });
  expect(gun.spikeContacts).toEqual([]);
  expect(sentinel.age).toBe(0);
  expect(sentinel.artAge).toBe(1);
  world.step(emptyInput());
  expect(world.allies).not.toContain(victim);
  expect(sentinel.life).toBe(97);
  expect(sentinel.age).toBe(1);
});

test('jam, stun and pause suspend Spike contact memory until an active part call', () => {
  const { world, owner, gun } = setup();
  world.hitTest = () => false;
  world.field.cleared = false;
  gun.spikeContacts = [{ target: world.player, remaining: 15 }];
  owner.status.jam = 2;
  world.step(emptyInput());
  expect(gun.spikeContacts[0].remaining).toBe(15);
  world.step(emptyInput());
  expect(gun.spikeContacts[0].remaining).toBe(14);
  owner.status.stun = 1;
  world.step(emptyInput());
  expect(gun.spikeContacts[0].remaining).toBe(14);
  world.mode = 'paused';
  world.step(emptyInput());
  expect(gun.spikeContacts[0].remaining).toBe(14);
});
