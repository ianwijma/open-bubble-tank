import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickFlak } from '../src/game/simulation/flak';
import { tickGrow } from '../src/game/simulation/grow';
import { tickBullet } from '../src/game/simulation/projectiles';
import { createTank } from '../src/game/simulation/tank';
import { emptyInput, World } from '../src/game/simulation/world';

function setup(kind: 'grow' | 'flak') {
  const world = new World([], [], 17);
  world.player.x = -200;
  const target = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0, parts: [STARTER.parts[0]] },
    'enemy',
    200,
    0,
  );
  world.field.enemies = [target];
  world.hitTest = () => false;
  world.hitProjectile = () => false;
  const bullet = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind,
    symbol: kind === 'grow' ? 1943 : 2031,
    x: 0,
    y: 0,
    angle: 0,
    speed: kind === 'grow' ? 10 : 4,
    damage: kind === 'grow' ? 1 : 0,
    partType: kind === 'grow' ? 2015 : 5004,
  });
  world.addBullet(bullet);
  return { world, target, bullet };
}
const effects = (world: World) => world.runtimeFor(world.field).effectQueue;

test('Grow permits twenty scale/fade/contact/movement updates, then removes on Run21', () => {
  const { world, bullet } = setup('grow');
  world.rng.int = () => 0;
  for (let i = 0; i < 20; i++) tickGrow(world, bullet);
  expect(bullet.dead).toBe(false);
  expect(bullet.x).toBe(200);
  expect(bullet.artAlpha).toBe(0);
  expect(bullet.artScale).toBeCloseTo(2);
  expect(bullet.radius).toBeCloseTo(4);
  expect(bullet.life).toBe(Infinity);
  expect(world.bullets).toContain(bullet);
  tickGrow(world, bullet);
  expect(bullet.dead).toBe(true);
  expect(world.bullets).not.toContain(bullet);
  expect(bullet.x).toBe(200);
  expect(effects(world)).toHaveLength(0);
});

test('Grow transparent removal precedes wall expiry and does not consume random movement', () => {
  const { world, bullet } = setup('grow');
  bullet.x = 416;
  bullet.artAlpha = 0;
  world.rng.int = () => {
    throw new Error('transparent Grow must not draw jitter');
  };
  tickGrow(world, bullet);
  expect(bullet.dead).toBe(true);
  expect(world.bullets).not.toContain(bullet);
  expect(bullet.artScale).toBe(1);
  expect(effects(world)).toHaveLength(0);
});

test('Grow wall expiry precedes scaling, alpha mutation and tank contact', () => {
  const { world, bullet } = setup('grow');
  bullet.x = 416;
  world.hitTest = () => {
    throw new Error('outside Grow must not test tank shapes');
  };
  tickGrow(world, bullet);
  expect([bullet.artScale, bullet.artAlpha ?? 1, bullet.x]).toEqual([1, 1, 416]);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('Grow jitter uses immutable heading and contact half-step follows its new movement', () => {
  const { world, target, bullet } = setup('grow');
  bullet.heading = 90;
  bullet.angle = 170;
  const jitters = [5, -5];
  world.rng.int = (minimum, maximum) => {
    expect([minimum, maximum]).toEqual([-5, 5]);
    return jitters.shift()!;
  };
  const samples: [number, number][] = [];
  world.hitTest = (tank, x, y) => {
    expect(tank).toBe(target);
    samples.push([x, y]);
    // First sample opens the enemy-layer gate; only the half-step hits the tank.
    return samples.length % 3 !== 2;
  };
  world.damage = () => {};
  tickGrow(world, bullet);
  expect(bullet.angle).toBe(95);
  expect(bullet.heading).toBe(90);
  expect(bullet.x).toBeCloseTo(Math.cos((95 * Math.PI) / 180) * 10);
  expect(bullet.y).toBeCloseTo(Math.sin((95 * Math.PI) / 180) * 10);
  expect(samples[2][0]).toBeCloseTo(-Math.cos((95 * Math.PI) / 180) * 5);
  expect(samples[2][1]).toBeCloseTo(-Math.sin((95 * Math.PI) / 180) * 5);
  tickGrow(world, bullet);
  expect(bullet.angle).toBe(85);
  expect(bullet.heading).toBe(90);
  expect(samples.length).toBeGreaterThan(0);
  expect(bullet.dead).toBe(false);
});

test('Grow ignores positive tank collision and moves after its callback and direct damage', () => {
  const { world, target, bullet } = setup('grow');
  world.rng.int = () => 0;
  world.hitTest = (tank) => tank === target;
  world.damage = (tank, amount, source) => {
    expect([tank, amount, source]).toEqual([target, 1, bullet]);
    expect(bullet.x).toBe(0);
    expect(bullet.artScale).toBeCloseTo(1.05);
    expect(bullet.artAlpha).toBeCloseTo(0.95);
    expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
  };
  tickGrow(world, bullet);
  expect(bullet.x).toBe(10);
  expect(bullet.dead).toBe(false);
});

test('Grow scale and alpha freeze under state2 deflection and World pause', () => {
  const { world, bullet } = setup('grow');
  world.rng.int = () => 0;
  tickGrow(world, bullet);
  const scale = bullet.artScale,
    alpha = bullet.artAlpha;
  bullet.deflected = { x: 2, y: 3 };
  tickBullet(world, bullet, emptyInput());
  expect([bullet.x, bullet.y, bullet.artScale, bullet.artAlpha]).toEqual([12, 3, scale, alpha]);
  world.pause();
  const age = bullet.age;
  for (let i = 0; i < 8; i++) world.step(emptyInput());
  expect([bullet.x, bullet.y, bullet.age, bullet.artScale, bullet.artAlpha]).toEqual([
    12,
    3,
    age,
    scale,
    alpha,
  ]);
});

test('Grow immediate removal preserves the source live-loop skip of the shifted next bullet', () => {
  const { world, bullet } = setup('grow');
  bullet.artAlpha = 0;
  const shifted = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    angle: 0,
    speed: 10,
    damage: 1,
  });
  world.addBullet(shifted);
  world.step(emptyInput());
  expect(world.bullets).not.toContain(bullet);
  expect([shifted.age, shifted.x]).toEqual([0, 0]);
  world.step(emptyInput());
  expect([shifted.age, shifted.x]).toEqual([1, 10]);
});

test('Flak polls authored frame15 before movement, emits area damage once per polled frame, and never tests tanks', () => {
  const { world, bullet } = setup('flak');
  const bursts: [Projectile, number, number, number][] = [];
  world.explode = (shot, radius, damage) => bursts.push([shot, radius, damage, shot.x]);
  world.hitTest = () => {
    throw new Error('Flak TestForCollision always returns false');
  };
  bullet.age = 900;
  bullet.artFrame = 14;
  tickFlak(world, bullet);
  expect(bursts).toHaveLength(0);
  bullet.artFrame = 15;
  tickFlak(world, bullet);
  expect(bursts).toEqual([[bullet, 60, 2, 4]]);
  expect(bullet.x).toBe(8);
  expect(bullet.dead).toBe(false);
  expect(effects(world)).toHaveLength(0);
});

test('Flak frame23 removes before movement, with no retroactive explosion', () => {
  const { world, bullet } = setup('flak');
  bullet.artFrame = 23;
  world.explode = () => {
    throw new Error('frame23 must not replay frame15 area damage');
  };
  tickFlak(world, bullet);
  expect(bullet.dead).toBe(true);
  expect(bullet.x).toBe(0);
  expect(effects(world)).toHaveLength(0);
});

test('Flak wall expiry takes precedence over authored frame15 area damage', () => {
  const { world, bullet } = setup('flak');
  bullet.x = 416;
  bullet.artFrame = 15;
  world.explode = () => {
    throw new Error('wall must precede Flak detonation');
  };
  tickFlak(world, bullet);
  expect(bullet.dead).toBe(true);
  expect(effects(world).map((effect) => effect.symbol)).toEqual([1723]);
});

test('Flak stage playback can pass detonation while paused and stop at23 before resuming into removal', () => {
  const { world, bullet } = setup('flak');
  world.explode = () => {
    throw new Error('paused playback must not retroactively detonate');
  };
  world.pause();
  for (let i = 0; i < 40; i++) world.step(emptyInput());
  expect([bullet.age, bullet.x, bullet.artFrame, bullet.dead]).toEqual([0, 0, 23, false]);
  world.resume();
  world.step(emptyInput());
  expect(bullet.dead).toBe(true);
  expect(world.bullets).not.toContain(bullet);
  expect(bullet.x).toBe(0);
});
