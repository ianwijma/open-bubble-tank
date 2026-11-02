import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { WEAPONS } from '../src/game/data/weapons';
import { createTank } from '../src/game/simulation/tank';
import { applyProjectileStatus } from '../src/game/simulation/status';
import type { Projectile } from '../src/game/core/types';

function setup(...weapons: number[]) {
  const world = new World([], [], 1);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [
        STARTER.parts[0],
        ...weapons.map((type, i) => ({ ...STARTER.parts[1], type, key: `gun-${i}` })),
      ],
    },
    'player',
    0,
    0,
    50,
    1,
  );
  world.hitTest = () => false;
  return world;
}
const fire = () => ({ ...emptyInput(), fire: true });
const frames = (world: World, count: number) => {
  for (let i = 0; i < count; i++) world.step(emptyInput());
};

test('manual triggers precede combat, cooldowns follow it, and HUD retains the interface snapshot', () => {
  const world = setup(2001);
  world.step(fire());
  expect(world.player.guns[0].counter).toBe(12);
  expect(world.hud.readout(world.player, world.secondaryCounter).rows[0].fill).toBe(0);
  expect(world.bullets[0].age).toBe(1);
  world.step(emptyInput());
  expect(world.player.guns[0].counter).toBe(11);
  expect(world.hud.readout(world.player, world.secondaryCounter).rows[0].fill).toBeCloseTo(1 / 13);
  world.pickups.push({
    uid: world.nextId(),
    x: 0,
    y: 0,
    value: 5,
    vx: 0,
    vy: 0,
    rotation: 0,
    scattering: false,
    collected: true,
    forced: false,
    dead: false,
  });
  world.step(emptyInput());
  expect(world.player.life).toBe(6);
  expect(world.hud.readout(world.player, world.secondaryCounter).life).toBe(1);
  world.step(emptyInput());
  expect(world.hud.readout(world.player, world.secondaryCounter).life).toBe(6);
});

test('large-class manual triggers use the prior part aim, then aim updates in Avatar.Run', () => {
  const world = setup(2001);
  world.player = createTank(
    world.nextId(),
    { ...world.player.design, classId: 4 },
    'player',
    0,
    0,
    50,
    1,
  );
  const gun = world.player.guns[0];
  gun.part = { ...gun.part, x: 0, y: 0 };
  gun.angle = 30;
  world.step({ ...fire(), aim: { x: 275, y: 125 } });
  expect(world.bullets[0].angle).toBe(30);
  expect(gun.angle).toBeCloseTo(-90);
  gun.counter = -1;
  world.step({ ...fire(), aim: { x: 275, y: 125 } });
  expect(world.bullets.at(-1)!.angle).toBeCloseTo(-90);
});

test('passive weapons run before infection, allowing their final shot before a late lethal tick', () => {
  const world = setup(5006);
  world.progression.level = 1;
  world.progression.history.push(STARTER);
  world.player.status.infect = Infinity;
  world.player.infectCounter = 11;
  world.step(emptyInput());
  expect(world.player.life).toBe(0);
  expect(world.bullets[0].kind).toBe('orbital');
  expect(world.bullets[0].age).toBe(0);
});

test('secondary readiness includes its separate zero reset frame and advances during travel', () => {
  const world = setup(3010);
  world.secondaryCounter = 2;
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  expect(world.secondaryCounter).toBe(1);
  world.step(emptyInput());
  expect(world.secondaryCounter).toBe(0);
  world.step(emptyInput());
  expect(world.secondaryCounter).toBe(-1);
  world.pause();
  world.step(emptyInput());
  expect(world.secondaryCounter).toBe(-1);
});

test('auto cannon acquires after its first attempt and retains the last equally close target', () => {
  const world = setup(5003);
  const design = { ...STARTER, avatar: false, speed: 0, parts: [STARTER.parts[0]] };
  const left = createTank(world.nextId(), design, 'enemy', -100, 0),
    right = createTank(world.nextId(), design, 'enemy', 100, 0);
  world.field.enemies = [left, right];
  world.player.guns[0].part = { ...world.player.guns[0].part, x: 0, y: 0 };
  world.step(emptyInput());
  expect(world.bullets).toEqual([]);
  expect(world.player.guns[0].autoTargetId).toBe(right.uid);
  world.step(emptyInput());
  expect(world.bullets[0].age).toBe(0);
  expect(world.bullets[0].angle).toBe(0);
});

test('flak acquisition includes friendly infection shots and waits one part call before firing', () => {
  const world = setup(5004);
  const seeker: Projectile = {
    uid: world.nextId(),
    owner: world.player.uid,
    enemy: false,
    x: 50,
    y: 0,
    kind: 'infect',
    angle: 0,
    heading: 0,
    speed: 0,
    damage: 1,
    radius: 2,
    age: 0,
    life: 500,
    explode: 0,
    hit: new Set(),
    targetId: null,
    dead: false,
    symbol: 15,
    orbit: 0,
  };
  const target = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100 },
    'enemy',
    200,
    0,
  );
  world.field.enemies.push(target);
  seeker.targetId = target.uid;
  world.bullets.push(seeker);
  world.step(emptyInput());
  expect(world.bullets).toHaveLength(1);
  world.step(emptyInput());
  expect(world.bullets.some((bullet) => bullet.kind === 'flak' && bullet.age === 0)).toBe(true);
});

test('player launcher uses 100ms Timer callbacks and current emitters through jam, stun and pause', () => {
  const world = setup(3015),
    gun = world.player.guns[0];
  world.fireGun(world.player, gun, emptyInput());
  world.advanceTime(99);
  expect(world.bullets).toEqual([]);
  world.player.x = 50;
  const muzzle = world.muzzle(world.player, gun, 13, 0);
  world.pause();
  applyProjectileStatus(world, world.player, 'jam');
  applyProjectileStatus(world, world.player, 'stun');
  world.advanceTime(1);
  expect(world.bullets).toHaveLength(1);
  expect([world.bullets[0].x, world.bullets[0].y]).toEqual([muzzle.x, muzzle.y]);
  world.advanceTime(900);
  expect(world.bullets).toHaveLength(10);
  expect(world.bullets.every((bullet) => bullet.age === 0)).toBe(true);
  expect(world.stats.frames).toBe(0);
  world.advanceTime(1000);
  expect(world.bullets).toHaveLength(10);
});

test('normal crossing and avatar replacement cancel timers; death escape consumes rejected timer events', () => {
  const normal = setup(3015);
  normal.fireGun(normal.player, normal.player.guns[0], emptyInput());
  normal.jump({ x: 1, y: 0 });
  normal.advanceTime(1000);
  expect(normal.stats.shots).toBe(0);
  const replaced = setup(3015);
  replaced.fireGun(replaced.player, replaced.player.guns[0], emptyInput());
  replaced.editPlayer(STARTER);
  replaced.advanceTime(1000);
  expect(replaced.stats.shots).toBe(0);
  const escaped = setup(3015);
  escaped.fireGun(escaped.player, escaped.player.guns[0], emptyInput());
  escaped.damage(escaped.player, 5);
  escaped.advanceTime(200);
  expect(escaped.stats.shots).toBe(0);
  escaped.player.x = escaped.transit!.target.x;
  escaped.player.y = escaped.transit!.target.y;
  escaped.step(emptyInput(), 0);
  expect(escaped.mode).toBe('playing');
  escaped.advanceTime(1000);
  expect(escaped.stats.shots).toBe(8);
});

test('Massive Cannon completion follows the bullet phase and observes looping authored frames during pause', () => {
  const world = setup(3008),
    gun = world.player.guns[0];
  world.fireGun(world.player, gun, emptyInput());
  frames(world, 5); // Effect is now on frame6.
  world.pause();
  frames(world, 20); // Timeline reaches26 without engine polling.
  expect(world.bullets).toEqual([]);
  world.player.x = 40;
  const muzzle = world.muzzle(world.player, gun);
  world.resume();
  world.step(emptyInput());
  expect(world.bullets[0].damage).toBe(100);
  expect(world.bullets[0].age).toBe(0);
  expect([world.bullets[0].x, world.bullets[0].y]).toEqual([muzzle.x, muzzle.y]);
  world.step(emptyInput());
  expect(world.bullets[0].age).toBe(1);
  const loop = setup(3008);
  loop.fireGun(loop.player, loop.player.guns[0], emptyInput());
  loop.pause();
  frames(loop, 26);
  loop.resume();
  loop.step(emptyInput());
  expect(loop.bullets).toEqual([]); // Frame1 was reached again, not a latched completion.
});

test('arrival drops callbacks from both registered effect populations without completing them', () => {
  const world = setup(3008);
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  world.jump({ x: 1, y: 0 });
  const transit = world.transit!,
    runtime = world.runtimeFor(transit.next);
  runtime.pending.push({ owner: world.player, gun: world.player.guns[0], total: 26, frame: 1 });
  world.player.x = transit.target.x;
  world.player.y = transit.target.y;
  world.step(emptyInput());
  expect(world.mode).toBe('playing');
  expect(runtime.pending).toEqual([]);
  frames(world, 30);
  expect(world.bullets.some((bullet) => bullet.damage === 100)).toBe(false);
});

test('maintained player beams survive without refresh and stop immediately on release during pause', () => {
  const world = setup(2017);
  world.step(fire());
  const beam = world.bullets[0];
  expect(beam.life).toBe(Infinity);
  world.pause();
  frames(world, 100);
  expect(world.bullets).toEqual([beam]);
  world.stopPrimaryFire();
  expect(world.bullets).toEqual([]);
  expect(world.mode).toBe('paused');
});

test('enemy launcher retains its six-call burst delay after the first complete burst', () => {
  const world = setup();
  const tank = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      speed: 0,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4020 }],
    },
    'enemy',
    100,
    0,
  );
  world.field.enemies = [tank];
  const gun = tank.guns[0];
  world.fireGun(tank, gun, emptyInput());
  world.step(emptyInput());
  expect(world.bullets).toHaveLength(1);
  frames(world, 24);
  expect(gun.burst).toBe(0);
  expect(gun.burstTimer).toBe(6);
  world.bullets = [];
  world.fireGun(tank, gun, emptyInput());
  frames(world, 5);
  expect(world.bullets).toEqual([]);
  world.step(emptyInput());
  expect(world.bullets).toHaveLength(1);
  expect(WEAPONS[4020].rate).toBe(150);
});

test('normal boundary FinalPartCall clears readouts before the initiation frame can rebuild and freeze them', () => {
  const world = setup(5002);
  world.field.enemies = [
    createTank(
      world.nextId(),
      { ...STARTER, avatar: false, speed: 0, parts: [STARTER.parts[0]] },
      'enemy',
      350,
      0,
    ),
  ];
  world.step(emptyInput());
  expect(world.tacticalHud.passives).toHaveLength(1);
  world.player.x = 425;
  world.step(emptyInput());
  expect(world.mode).toBe('transit');
  expect(world.tacticalHud.passives).toHaveLength(1);
  const rebuilt = world.tacticalHud.passives;
  world.step(emptyInput());
  expect(world.tacticalHud.passives).toBe(rebuilt);
});

test('field firing audio latches during pause while wall-timed rockets still count as shots', () => {
  const world = setup(3015);
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  world.pause();
  world.advanceTime(1000);
  expect(world.stats.shots).toBe(10);
  expect(world.drainEvents().filter((event) => event.type === 'shoot')).toHaveLength(1);
  const timer = world.runtimeFor(world.field).shootTimer;
  frames(world, 100);
  expect(world.runtimeFor(world.field).shootTimer).toBe(timer);
});

test('heavy steering reads the previous movement vector while pointer steering continues during transit', () => {
  const heavy = setup(2001);
  heavy.player.design = { ...heavy.player.design, classId: 4 };
  heavy.step({ ...emptyInput(), down: true });
  expect(heavy.player.velocity.y).toBeCloseTo(0.27);
  expect(heavy.player.rotation).toBe(0);
  heavy.step({ ...emptyInput(), down: true });
  expect(heavy.player.rotation).toBeCloseTo(0.0675);
  const light = setup(2001);
  light.jump({ x: 1, y: 0 });
  light.step({ ...emptyInput(), aim: { x: 275, y: 125 } });
  expect(light.player.rotation).toBe(-90);
});

test('shield and Massive Cannon retain their part counters; jam can suppress a new launcher timer independently of the shared timer', () => {
  const shield = setup(3010),
    massive = setup(3008),
    rockets = setup(3015);
  shield.step({ ...emptyInput(), secondary: true });
  massive.step({ ...emptyInput(), secondary: true });
  expect(shield.player.guns[0].counter).toBe(WEAPONS[3010].rate - 1);
  expect(massive.player.guns[0].counter).toBe(WEAPONS[3008].rate - 1);
  applyProjectileStatus(rockets, rockets.player, 'jam', 1);
  rockets.fireGun(rockets.player, rockets.player.guns[0], emptyInput());
  rockets.advanceTime(1000);
  expect(rockets.bullets).toEqual([]);
});
