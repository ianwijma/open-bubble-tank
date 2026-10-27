import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { WEAPONS } from '../src/game/data/weapons';
import { createTank } from '../src/game/simulation/tank';
import { orderSecondaries, tickGuns } from '../src/game/simulation/weapons';
import { tickBullet } from '../src/game/simulation/projectiles';
import { projectileImpact } from '../src/game/simulation/effects';

function setup(...types: number[]) {
  const world = new World([], [], 8);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [
        STARTER.parts[0],
        ...types.map((type, i) => ({ ...STARTER.parts[1], type, key: `g${i}`, x: 0, y: 0 })),
      ],
    },
    'player',
  );
  world.hitTest = () => false;
  world.player.life = 1;
  world.player.maxLife = 50;
  return world;
}
function shot(world: World, type: number) {
  const gun = world.player.guns.find((g) => g.part.type === type)!;
  world.spawnVolley(world.player, gun, WEAPONS[type]);
  return world.bullets.at(-1)!;
}
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;

test('projectile callbacks choose native art separately from damage and splash', () => {
  const matrix: [number, number[]][] = [
    [2001, [1723]],
    [2009, [1723]],
    [2010, [1723, 1746]],
    [2011, [1740]],
    [3004, [1723, 1745]],
    [3008, [1723, 1746]],
    [3009, [1767]],
    [3013, []],
    [2017, []],
    [3014, []],
    [2018, []],
    [5004, []],
    [5006, [1767]],
  ];
  for (const [type, expected] of matrix) {
    const world = setup(type);
    const bullet = shot(world, type);
    queue(world).splice(0); // Constructor/Setup effects are separate from this collision callback.
    projectileImpact(world, bullet);
    expect(queue(world).map((e) => e.symbol)).toEqual(expected);
  }
  const world = setup(2001),
    target = createTank(100, { ...STARTER, avatar: false }, 'enemy', 100, 0);
  world.damage(target, 1);
  world.kill(target);
  world.explode(shot(world, 2001), 100, 1);
  expect(queue(world)).toEqual([]);
  expect(world.effects).toEqual([]);
});

test('queued effects flush after field combat; paused clips loop and cleanup waits for polling', () => {
  const world = setup();
  const effect = world.addCombatEffect({ x: 30, y: 40 }, 'impact');
  expect(world.effects).toEqual([]);
  world.step(emptyInput());
  expect(world.effects).toEqual([effect]);
  expect(effect.age).toBe(1);
  world.mode = 'paused';
  for (let i = 0; i < 6; i++) world.step(emptyInput());
  expect(effect.age).toBe(7);
  expect(world.effects).toEqual([effect]);
  world.mode = 'playing';
  world.step(emptyInput());
  expect(world.effects).toEqual([]); // currentFrame4 triggers engine cleanup.
});

test('both field queues register in the outgoing engine layer; arrival discards live clips', () => {
  const world = setup();
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    runtime = world.runtimeFor(next);
  next.enemies = [];
  runtime.effectQueue.push({
    ...world.addCombatEffect({ x: 12, y: 13 }, 'impact'),
    uid: world.nextId(),
    x: -40,
    y: 25,
  });
  world.step(emptyInput());
  expect(runtime.effects).toEqual([]);
  expect(world.effects.map((e) => [e.x, e.y])).toEqual([
    [12, 13],
    [-40, 25],
  ]);
  world.addCombatEffect({ x: 0, y: 0 }, 'rocketTrail', {}, true);
  for (let i = 0; i < 200 && world.transit; i++) world.step(emptyInput());
  expect(world.transit).toBeNull();
  expect(world.effects).toEqual([]);
});

test('rocket trails join every third successful movement position and start without a segment', () => {
  const world = setup(3015),
    rocket = shot(world, 3015);
  rocket.x = rocket.y = 0;
  rocket.angle = rocket.heading = 0;
  rocket.wobbleAmplitude = 0;
  for (let i = 0; i < 9; i++) tickBullet(world, rocket, emptyInput());
  expect(world.effects.map((e) => [e.symbol, e.x, e.y, e.line])).toEqual([
    [2175, 30, 0, undefined],
    [2175, 60, 0, { x: -30, y: 0 }],
    [2175, 90, 0, { x: -30, y: 0 }],
  ]);
  expect(world.effects.every((e) => e.duration === 25 && e.layer === 'bottom')).toBe(true);
  expect(queue(world)).toEqual([]);
});

test('teleport uses both authored registration endpoints, boundary clamp, one-per-frame gate and slot swaps', () => {
  const world = setup(3003, 3012, 3008, 3011);
  const guns = orderSecondaries(world.player.guns);
  expect(guns.map((g) => g.part.type)).toEqual([3003, 3011, 3008, 3012]);
  const gun = guns[1];
  gun.part = { ...gun.part, x: 10, y: 0, scale: 1 };
  world.fireGun(world.player, gun, { ...emptyInput(), aim: { x: 375, y: 225 } });
  expect(queue(world).map((e) => [e.symbol, e.x, e.y, e.duration])).toEqual([
    [1769, 20, 0, 12],
    [1769, 100, 0, 12],
  ]);
  expect(world.player.x).toBe(80);
  expect(world.mainEffects.flashes).toEqual([{ color: 0xffffff, fillAlpha: 1, alpha: 1 }]);
  world.fireGun(world.player, guns[3], emptyInput());
  expect(queue(world)).toHaveLength(2);
  world.player.teleportReady = true;
  world.fireGun(world.player, guns[3], { ...emptyInput(), aim: { x: 2000, y: 225 } });
  expect(queue(world).at(-1)!.x).toBeCloseTo(423.75 * world.field.scale);
});

test('burst damage and its clip share the emitter center and exact 145px radius', () => {
  const world = setup(3003),
    gun = world.player.guns[0],
    pos = world.muzzle(world.player, gun);
  const enemies = [145, 145.01].map((offset, i) =>
    createTank(100 + i, { ...STARTER, avatar: false, life: 100 }, 'enemy', pos.x + offset, pos.y),
  );
  world.field.enemies = enemies;
  world.fireGun(world.player, gun, emptyInput());
  expect(enemies.map((e) => e.life)).toEqual([75, 100]);
  expect(queue(world).map((e) => [e.symbol, e.x, e.y])).toEqual([[1789, pos.x, pos.y]]);
});

test('ripple remains ready until a target is close, then replaces ally force and emits once', () => {
  const world = setup(),
    enemy = createTank(
      100,
      {
        ...STARTER,
        avatar: false,
        speed: 0,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4024 }],
      },
      'enemy',
      500,
      0,
    );
  const gun = enemy.guns[0];
  gun.counter = 80;
  tickGuns(world, enemy, emptyInput());
  expect(gun.counter).toBe(80);
  expect(queue(world)).toEqual([]);
  enemy.x = 80;
  const ally = createTank(101, { ...STARTER, avatar: false }, 'ally', 10, 0);
  ally.velocity = { x: 999, y: 999 };
  world.allies.push(ally);
  tickGuns(world, enemy, emptyInput());
  expect(queue(world).map((e) => e.symbol)).toEqual([52]);
  expect(gun.counter).toBe(0);
  expect(ally.velocity.x).toBeLessThan(0);
  expect(ally.velocity.y).toBeCloseTo(0);
  expect(world.player.velocity.x).toBeLessThan(0);
});

test('neutralizer consumes its fuse flag, immediately creates scaled clips and cools only while armed', () => {
  const world = setup(3017),
    enemy = createTank(
      100,
      { ...STARTER, avatar: false, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4023 }] },
      'enemy',
      100,
      0,
    );
  const gun = enemy.guns[0],
    bullet = shot(world, 3017);
  const runtime = world.runtimeFor(world.field);
  expect(gun.counter).toBe(240);
  tickGuns(world, enemy, emptyInput());
  expect(bullet.dead).toBe(false);
  runtime.apocalypse = true;
  tickGuns(world, enemy, emptyInput());
  expect(bullet.dead).toBe(true);
  expect(runtime.apocalypse).toBe(false);
  expect(gun.counter).toBe(0);
  expect(world.effects.map((e) => [e.symbol, e.scale, e.duration])).toEqual([[2212, 3, 29]]);
  tickGuns(world, enemy, emptyInput());
  expect(gun.counter).toBe(0);
});
