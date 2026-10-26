import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { initializeSapper, tickSapper } from '../src/game/simulation/sapper';
import { createTank } from '../src/game/simulation/tank';
import { emptyInput, World } from '../src/game/simulation/world';

function setup(playerX = 100) {
  const world = new World([], [], 9);
  world.player.x = playerX;
  world.player.y = 0;
  world.player.life = 40;
  world.hitTest = () => false;
  world.hitProjectile = () => false;
  const master = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      speed: 0,
      parts: [
        { ...STARTER.parts[0], x: 0, y: 0 },
        { ...STARTER.parts[1], key: 'sapper', type: 4012, x: 20, y: 0 },
      ],
    },
    'enemy',
    -100,
    0,
  );
  master.life = 60;
  master.guns[0].counter = Infinity;
  world.field.enemies = [master];
  const bullet: Projectile = {
    uid: world.nextId(),
    owner: master.uid,
    enemy: true,
    kind: 'sapper',
    x: 0,
    y: 0,
    angle: 90,
    heading: 90,
    speed: 6,
    damage: 3,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: world.player.uid,
    hit: new Set(),
    dead: false,
    anchor: master.guns[0],
    symbol: 1831,
    partType: 4012,
    orbit: 0,
  };
  world.addBullet(bullet);
  initializeSapper(world, bullet);
  return { world, master, bullet };
}
const effects = (world: World) => world.runtimeFor(world.field).effectQueue;

test('sapper Setup stops at art3 and steers immediately without moving', () => {
  const { bullet } = setup();
  expect([bullet.x, bullet.y, bullet.angle, bullet.artFrame, bullet.returning]).toEqual([
    0,
    0,
    0,
    3,
    false,
  ]);
});

test('sapper wall expiry precedes master lookup, shot tests, target contact and steering', () => {
  const { world, master, bullet } = setup();
  bullet.x = 416;
  bullet.angle = 123;
  master.life = 8;
  world.hitProjectile = () => {
    throw new Error('wall must precede interception');
  };
  world.hitTest = () => {
    throw new Error('wall must precede target contact');
  };
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(true);
  expect([bullet.x, bullet.y, bullet.angle]).toEqual([416, 0, 123]);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('sapper intercepts the first friendly shell at its backward half-step without consuming it', () => {
  const { world, bullet } = setup();
  const incoming = { ...bullet, uid: world.nextId(), enemy: false, kind: 'shell' as const };
  world.bullets.push(incoming);
  const samples: [number, number][] = [];
  world.hitProjectile = (shot, x, y) => {
    expect(shot).toBe(incoming);
    samples.push([x, y]);
    return x === -3 && y === 0;
  };
  world.hitTest = () => {
    throw new Error('shot interception precedes target contact');
  };
  tickSapper(world, bullet);
  expect(samples).toEqual([
    [0, 0],
    [-3, 0],
  ]);
  expect(bullet.dead).toBe(true);
  expect(incoming.dead).toBe(false);
  expect(world.player.life).toBe(40);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('outbound sapper ignores allies and flips art immediately while preserving its old movement', () => {
  const { world, bullet } = setup();
  const ally = createTank(world.nextId(), { ...STARTER, avatar: false }, 'ally');
  world.allies.push(ally);
  world.hitTest = (tank) => tank === ally;
  tickSapper(world, bullet);
  expect(bullet.returning).toBe(false);
  expect(world.player.life).toBe(40);
  world.hitTest = (tank) => tank === world.player;
  tickSapper(world, bullet);
  expect(world.player.life).toBe(37);
  expect([bullet.x, bullet.y, bullet.artFrame, bullet.returning]).toEqual([12, 0, 2, true]);
  expect(bullet.dead).toBe(false);
});

test('sapper shield contact invokes impact before removing without calling Damage or consuming shield', () => {
  const { world, bullet } = setup();
  world.player.shield = 1;
  world.hitTest = (tank) => tank === world.player;
  world.damage = () => {
    throw new Error('shielded sapper contact bypasses Damage');
  };
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(true);
  expect([bullet.x, bullet.artFrame, world.player.shield, world.player.life]).toEqual([
    0, 3, 1, 40,
  ]);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('sapper impact is queued before unshielded Damage and target state changes', () => {
  const { world, bullet } = setup();
  world.hitTest = (tank) => tank === world.player;
  world.damage = (tank, damage, source) => {
    expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
    expect([bullet.artFrame, bullet.returning]).toEqual([3, false]);
    expect([tank, damage, source]).toEqual([world.player, 3, bullet]);
  };
  tickSapper(world, bullet);
  expect([bullet.artFrame, bullet.returning]).toEqual([2, true]);
});

test('returning sapper steers to rotated gun registration, then contacts the master shape', () => {
  const { world, master, bullet } = setup();
  tickSapper(world, bullet);
  master.rotation = 90;
  master.x = 0;
  master.y = 0;
  bullet.x = 0;
  bullet.y = 10;
  bullet.returning = true;
  bullet.artFrame = 2;
  master.life = 56;
  world.hitTest = (tank, x, y) => tank === master && x === 0 && y === 10;
  tickSapper(world, bullet);
  expect(bullet.angle).toBeCloseTo(90);
  expect(bullet.x).toBeCloseTo(0);
  expect(bullet.y).toBeCloseTo(16);
  expect([master.life, bullet.returning, bullet.artFrame]).toEqual([58, false, 3]);
  expect(effects(world)).toHaveLength(0);
});

test('sapper caches current master life lazily and direct healing preserves body visibility and debt', () => {
  const { world, master, bullet } = setup();
  master.life = 24;
  tickSapper(world, bullet);
  master.life = 23;
  master.hiddenParts.add('retained-hidden-body');
  master.degradation.debt = 41;
  master.degradation.minimum = 8;
  const before = { ...master.degradation };
  bullet.returning = true;
  world.hitTest = (tank) => tank === master;
  tickSapper(world, bullet);
  expect(master.life).toBe(24);
  expect(master.hiddenParts.has('retained-hidden-body')).toBe(true);
  expect(master.degradation).toEqual(before);
});

test('sapper contains check retains dead-but-attached masters and removes after actual detachment', () => {
  const { world, master, bullet } = setup();
  master.dead = true;
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(false);
  world.field.enemies = [];
  const position = { x: bullet.x, y: bullet.y };
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(true);
  expect({ x: bullet.x, y: bullet.y }).toEqual(position);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('sapper Setup proximity survives until first contact; the five-unit boundary is strict and zoom-independent', () => {
  const initial = setup(4.5);
  initial.world.player.x = 100;
  tickSapper(initial.world, initial.bullet);
  expect(initial.bullet.returning).toBe(true);
  for (const zoom of [0.5, 1, 1.5]) {
    const { world, bullet } = setup();
    world.viewZoom = zoom;
    world.player.x = 10.5;
    bullet.x = 6;
    tickSapper(world, bullet);
    expect(bullet.returning).toBe(true);
    const boundary = setup();
    boundary.world.viewZoom = zoom;
    boundary.world.player.x = 5;
    tickSapper(boundary.world, boundary.bullet);
    expect(boundary.bullet.returning).toBe(false);
  }
});

test('sapper simulation and stopped artwork wait during pause then resume through World', () => {
  const { world, bullet } = setup();
  world.pause();
  const before = [bullet.x, bullet.y, bullet.age, bullet.artFrame, bullet.returning];
  for (let i = 0; i < 15; i++) world.step(emptyInput());
  expect([bullet.x, bullet.y, bullet.age, bullet.artFrame, bullet.returning]).toEqual(before);
  world.resume();
  world.step(emptyInput());
  expect(bullet.age).toBe(1);
  expect(bullet.x).toBeCloseTo(6);
  expect(bullet.artFrame).toBe(3);
});
