import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import type { Projectile } from '../src/game/core/types';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickSpinner } from '../src/game/simulation/spinner';
import { createTank } from '../src/game/simulation/tank';
import { World } from '../src/game/simulation/world';

function setup(options: Partial<Projectile> = {}) {
  const world = new World([], [], 10);
  world.hitTest = () => false;
  world.projectileWidth = () => 20;
  const b = createProjectile(world.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'spin',
    symbol: 2033,
    x: 0,
    y: 0,
    angle: 0,
    speed: 5,
    damage: 3,
    ...options,
  });
  return { world, b };
}
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;
function advance(world: World, b: Projectile, frames: number) {
  for (let i = 0; i < frames; i++) tickSpinner(world, b);
}

test('fifth-update volley combines travel/radial velocity and retains the radian-position quirk', () => {
  const { world, b } = setup({ angle: 90 });
  advance(world, b, 4);
  expect(world.bullets).toHaveLength(0);
  tickSpinner(world, b);
  expect(world.bullets).toHaveLength(4);
  for (let i = 0; i < 4; i++) {
    const shot = world.bullets[i],
      a = 51 + i * 90,
      vx = 10 * Math.cos((a * Math.PI) / 180),
      vy = 5 + 10 * Math.sin((a * Math.PI) / 180);
    expect(shot.x).toBeCloseTo(10 * Math.cos(a));
    expect(shot.y).toBeCloseTo(20 + 10 * Math.sin(a));
    expect(shot.speed).toBeCloseTo(Math.hypot(vx, vy));
    expect(shot.angle).toBeCloseTo((Math.atan2(vy, vx) * 180) / Math.PI);
  }
  expect(b.y).toBeCloseTo(25);
  expect(b.angle).toBe(90);
  advance(world, b, 5);
  expect(world.bullets[4].x).toBeCloseTo(10 * Math.cos(57));
  expect(b.age).toBe(0); // The source's private counter is independent of generic age.
});

test('helpers start with fresh base state and no parent weapon/callback fields', () => {
  const { world, b } = setup({
    status: 'stun',
    explode: 40,
    targetId: 123,
    partType: 4019,
    artScale: 3,
    artFrame: 8,
    beamLength: 300,
    health: 4,
    contactFrames: 9,
  });
  b.hit.add(123);
  advance(world, b, 5);
  const shot = world.bullets[0];
  expect([shot.symbol, shot.artScale, shot.damage, shot.enemy, shot.owner]).toEqual([
    1717,
    1,
    1,
    true,
    b.owner,
  ]);
  expect([shot.age, shot.life, shot.explode, shot.targetId, shot.orbit]).toEqual([
    0,
    Infinity,
    0,
    null,
    0,
  ]);
  expect(shot.hit.size).toBe(0);
  expect(shot.hit).not.toBe(b.hit);
  expect(shot.hit).not.toBe(world.bullets[1].hit);
  for (const key of ['status', 'partType', 'artFrame', 'beamLength', 'health', 'contactFrames'])
    expect(shot[key as keyof Projectile]).toBeUndefined();
});

test('ally contact opens the layer gate, takes priority over avatar and repeats despite hit history', () => {
  const { world, b } = setup({ speed: 0 });
  const ally = createTank(world.nextId(), { ...STARTER, life: 100 }, 'ally');
  world.allies.push(ally);
  world.player.life = 40;
  world.hitTest = (tank) => tank === ally || tank === world.player;
  advance(world, b, 2);
  expect(ally.life).toBe(94);
  expect(world.player.life).toBe(40);
  expect(b.dead).toBe(false);
  expect(b.hit.has(ally.uid)).toBe(true);
  expect(queue(world).map((effect) => effect.symbol)).toEqual([1723, 1723]);
});

test('avatar alone cannot open the layer gate; a current width sample can enable half-step contact', () => {
  const { world, b } = setup({ x: 10, speed: 20 });
  world.player.life = 40;
  world.hitTest = (tank, x, y) => tank === world.player && x === 0 && y === 0;
  tickSpinner(world, b);
  expect(world.player.life).toBe(40);
  const blocker = createTank(world.nextId(), STARTER, 'enemy', 20, 0);
  world.field.enemies.push(blocker);
  b.x = 10;
  world.hitTest = (tank, x, y) =>
    y === 0 && ((tank === blocker && x === 20) || (tank === world.player && x === 0));
  tickSpinner(world, b);
  expect(world.player.life).toBe(37);
  expect(b.x).toBe(30);
  expect(b.dead).toBe(false);
  expect(queue(world)[0].x).toBe(10);
});

test('volley precedes contact damage and movement, even when contact reports a hit', () => {
  const { world, b } = setup();
  const ally = createTank(world.nextId(), { ...STARTER, life: 100 }, 'ally');
  world.allies.push(ally);
  const events: string[] = [];
  const add = world.addBullet.bind(world);
  world.addBullet = (shot) => {
    events.push(`shot:${b.x}`);
    return add(shot);
  };
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    events.push(`damage:${b.x}`);
    damage(tank, amount, bullet);
  };
  advance(world, b, 4);
  world.hitTest = (tank) => tank === ally;
  tickSpinner(world, b);
  expect(events).toEqual(['shot:20', 'shot:20', 'shot:20', 'shot:20', 'damage:20']);
  expect(b.x).toBe(25);
});

test('wall expiry precedes volley and contact and uses the field-scaled radius', () => {
  const { world, b } = setup();
  advance(world, b, 4);
  world.field.scale = 0.5;
  b.x = 208;
  tickSpinner(world, b);
  expect(b.dead).toBe(true);
  expect(b.x).toBe(208);
  expect(world.bullets).toHaveLength(0);
  expect(queue(world).map((effect) => [effect.symbol, effect.x])).toEqual([[1723, 208]]);
});

test('declined transit volleys consume their counter and angle without a catch-up volley', () => {
  const { world, b } = setup({ speed: 0 });
  const add = world.addBullet.bind(world);
  let blocked = true;
  world.addBullet = (shot) => (blocked ? false : add(shot));
  advance(world, b, 5);
  expect(world.bullets).toHaveLength(0);
  blocked = false;
  advance(world, b, 4);
  expect(world.bullets).toHaveLength(0);
  tickSpinner(world, b);
  expect(world.bullets).toHaveLength(4);
  expect(world.bullets[0].x).toBeCloseTo(10 * Math.cos(57));
});
