import { expect, test } from 'bun:test';
import type { Field, Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { removeTankChild } from '../src/game/simulation/tank-display';
import { initializeAvatarSeeker } from '../src/game/simulation/avatar-seeker';
import { World, emptyInput } from '../src/game/simulation/world';

function setup() {
  const world = new World([], [], 29);
  world.hitTest = world.hitProjectile = () => false;
  world.player.life = 40;
  world.field.enemies = [];
  return world;
}
function enemy(world: World, x: number, y = 0) {
  const tank = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0 },
    'enemy',
    x,
    y,
  );
  tank.guns = [];
  world.field.enemies.push(tank);
  return tank;
}
function seeker(world: World, changes: Partial<Projectile> = {}) {
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'seeker',
    symbol: 1827,
    x: 0,
    y: 0,
    angle: 0,
    speed: 3,
    damage: 3,
    ...changes,
  });
  world.actorParents.sync(world);
  world.addBullet(bullet);
  return bullet;
}
const tick = (world: World, bullet: Projectile) => tickBullet(world, bullet, emptyInput());

test('friendly seeker reacquires the first array entry rather than a same-UID replacement', () => {
  const world = setup(),
    first = enemy(world, 100),
    target = enemy(world, 0, 100);
  const bullet = seeker(world, { targetId: target.uid });
  expect(bullet.angle).toBe(90);
  const replacement = { ...target, x: -100, y: 0 };
  world.field.enemies = [first, replacement];
  world.actorParents.sync(world);
  tick(world, bullet);
  expect(bullet.angle).toBe(0);
  expect(bullet.targetId).toBe(first.uid);
  expect(bullet.homing?.target === first).toBe(true);
});

test('friendly seeker retains a physically contained target missing from the raw array', () => {
  const world = setup(),
    first = enemy(world, 100),
    target = enemy(world, 0, 100);
  const bullet = seeker(world, { targetId: target.uid });
  world.field.enemies = [first]; // Array mutation does not remove the actual display child.
  world.actorParents.attach(target, world.field);
  tick(world, bullet);
  expect(bullet.angle).toBe(90);
  expect(bullet.homing?.target === target).toBe(true);
});

test('friendly seeker rejects a stale array target physically reparented into another wrapper', () => {
  const world = setup(),
    first = enemy(world, 100),
    target = enemy(world, 0, 100);
  const bullet = seeker(world, { targetId: target.uid });
  const other: Field = { ...world.field, col: 1, enemies: [target] };
  world.actorParents.attach(target, other);
  expect(world.field.enemies.includes(target)).toBe(true);
  tick(world, bullet);
  expect(bullet.angle).toBe(0);
  expect(bullet.homing?.target === first).toBe(true);
});

for (const kind of ['seeker', 'sapper'] as const)
  test(`${kind} Setup aims at the transformed cached hit detail through twip Point conversion`, () => {
    const world = setup(),
      target = createTank(
        world.nextId(),
        {
          ...STARTER,
          avatar: kind === 'sapper',
          parts: [{ ...STARTER.parts[0], x: 0.079, y: 0.149 }],
        },
        kind === 'sapper' ? 'player' : 'enemy',
        100,
        100,
      );
    if (kind === 'sapper') world.player = target;
    else world.field.enemies.push(target);
    target.rotation = 90;
    const home = enemy(world, -100);
    const bullet = seeker(world, {
      kind,
      enemy: kind === 'sapper',
      symbol: kind === 'sapper' ? 1831 : 1827,
      owner: kind === 'sapper' ? home.uid : world.player.uid,
      targetId: target.uid,
    });
    // Preserve the global Point subtraction, including Number cancellation.
    expect(bullet.angle).toBe((360 * Math.atan2(325.05 - 225, 374.9 - 275)) / (2 * Math.PI));
  });

for (const [angle, x, y] of [
  [0, 7, 5],
  [123, 2.35, 7.5],
])
  test(`canonical seeker birth at ${angle} re-enables motion after Setup queued removal, then fails one active Run`, () => {
    const world = setup(),
      bullet = seeker(world, { x: 4, y: 5, angle });
    expect(bullet.removeAfterFrame).toBe(true);
    tick(world, bullet);
    expect([bullet.x, bullet.y, bullet.angle]).toEqual([x, y, angle]);
    tick(world, bullet);
    expect([bullet.x, bullet.y, bullet.angle]).toEqual([x, y, angle]);
    expect(world.runtimeFor(world.field).effectQueue.map((effect) => effect.symbol)).toEqual([
      1767, 1767,
    ]);
    expect(world.drainEvents().filter((event) => event.type === 'hit')).toHaveLength(1);
    expect(world.hitSoundTimer).toBe(4);
  });

test('direct virtual Setup alone leaves failed seeker movement disabled without replaying its callback', () => {
  const world = setup(),
    bullet = createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'seeker',
      symbol: 1827,
      x: 4,
      y: 5,
      angle: 123,
      speed: 3,
      damage: 1,
    });
  initializeAvatarSeeker(world, bullet);
  tick(world, bullet);
  expect([bullet.x, bullet.y]).toEqual([4, 5]);
  expect(world.runtimeFor(world.field).effectQueue.map((effect) => effect.symbol)).toEqual([1767]);
});

test('friendly seeker whose target vanishes during Run completes that move once before removal', () => {
  const world = setup();
  const old = enemy(world, 100);
  const bullet = seeker(world);
  world.field.enemies = [];
  world.actorParents.sync(world);
  tick(world, bullet);
  expect(bullet.removeAfterFrame).toBe(true);
  expect(bullet.homing?.target === old).toBe(true);
  expect([bullet.x, bullet.y]).toEqual([3, 0]);
  tick(world, bullet);
  expect([bullet.x, bullet.y]).toEqual([3, 0]);
  expect(world.runtimeFor(world.field).effectQueue.map((effect) => effect.symbol)).toEqual([1767]);
  expect(world.drainEvents().filter((event) => event.type === 'hit')).toHaveLength(1);
});

function sapper() {
  const world = setup(),
    home = createTank(
      world.nextId(),
      {
        ...STARTER,
        avatar: false,
        life: 100,
        speed: 0,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], key: 'sapper', type: 4012, x: 20, y: 0 }],
      },
      'enemy',
      -100,
      0,
    );
  world.field.enemies = [home];
  const bullet = seeker(world, {
    owner: home.uid,
    enemy: true,
    kind: 'sapper',
    symbol: 1831,
    x: 200,
    y: 100,
    speed: 6,
    anchor: home.guns[0],
  });
  return { world, home, bullet };
}

test('Sapper keeps its old steering/contact target while base Run refreshes the damage avatar', () => {
  const { world, home, bullet } = sapper(),
    old = world.player;
  world.player = createTank(world.nextId(), STARTER, 'player', 0, 0, 100, 100);
  world.player.forcefield = 0;
  world.actorParents.sync(world);
  tick(world, bullet);
  expect(bullet.angle).toBe((360 * Math.atan2(-325, -475)) / (2 * Math.PI));
  expect(bullet.homing?.target === old).toBe(true);
  expect(bullet.homing?.avatar === world.player).toBe(true);
  let contact: unknown;
  world.hitTest = (tank) => {
    contact = tank;
    return true;
  };
  tick(world, bullet);
  expect(contact === old).toBe(true);
  expect(world.player.life).toBe(97);
  expect(old.life).toBe(40);
  expect(bullet.homing?.target === home).toBe(true);
  world.hitTest = (tank) => tank === home;
  tick(world, bullet);
  expect(bullet.returning).toBe(false);
  expect(bullet.homing?.target === world.player).toBe(true);
});

test('returning Sapper with a removed emitter preserves rotation and uses the zero-return vector', () => {
  const { world, home, bullet } = sapper();
  world.hitTest = (tank) => tank === world.player;
  tick(world, bullet);
  expect(bullet.returning).toBe(true);
  world.hitTest = () => false;
  bullet.x = 0;
  bullet.y = 10;
  bullet.angle = 123;
  home.x = home.y = 0;
  home.rotation = 90;
  removeTankChild(home, 'part:sapper');
  tick(world, bullet);
  expect([bullet.angle, bullet.x, bullet.y]).toEqual([123, 6, 10]);
  expect(bullet.returning).toBe(true);
});
