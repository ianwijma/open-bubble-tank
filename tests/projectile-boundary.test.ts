import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { deflectFirstEnemy } from '../src/game/simulation/bubble-buster';
import { projectileOutside } from '../src/game/simulation/projectile-boundary';
import { tickBullet } from '../src/game/simulation/projectiles';
import { World, emptyInput } from '../src/game/simulation/world';

function setup() {
  const world = new World([], [], 12);
  world.hitTest = () => false;
  world.hitProjectile = () => false;
  world.field.enemies = [];
  return world;
}
function shot(world: World, options: Partial<Projectile> = {}) {
  return createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    angle: 0,
    speed: 10,
    damage: 1,
    ...options,
  });
}
const tick = (w: World, b: Projectile) => tickBullet(w, b, emptyInput());
const misses = (w: World) => [w.stats.friendlyMissed, w.stats.enemyMissed];

test('wall tests are strict, scaled and report each invocation by faction', () => {
  const w = setup();
  w.field.scale = 2;
  const b = shot(w, { x: 830 });
  expect(projectileOutside(w, b)).toBe(false);
  b.x += 0.001;
  expect(projectileOutside(w, b)).toBe(true);
  expect(projectileOutside(w, b)).toBe(true);
  expect(misses(w)).toEqual([2, 0]);
  b.enemy = true;
  projectileOutside(w, b);
  expect(misses(w)).toEqual([2, 1]);
  b.missExempt = true;
  projectileOutside(w, b);
  expect(misses(w)).toEqual([2, 1]);
});

test('remembered contact IDs alone do not exempt a wall miss; exemption survives cleared memory', () => {
  const w = setup(),
    b = shot(w, { x: 416 });
  b.hit.add(123);
  tick(w, b);
  expect(misses(w)).toEqual([1, 0]);
  const exempt = shot(w, { x: 416, missExempt: true });
  exempt.hit.clear();
  tick(w, exempt);
  expect(exempt.dead).toBe(true);
  expect(misses(w)).toEqual([1, 0]);
});

test('subtype wall paths report before homing, contact, split or frame-polled blasts', () => {
  const kinds = [
    ['shell', 1721],
    ['rocket', 1730],
    ['seeker', 1827],
    ['grow', 1943],
    ['flak', 2031],
    ['star', 2028],
    ['push', 2221],
    ['spin', 2033],
    ['sapper', 1831],
    ['seekerMine', 2178],
    ['turret', 2444],
  ] as const;
  for (const [kind, symbol] of kinds) {
    const w = setup(),
      b = shot(w, { kind, symbol, x: 416 });
    let damage = 0,
      blasts = 0;
    w.damage = () => {
      damage++;
    };
    w.explode = () => {
      blasts++;
    };
    tick(w, b);
    expect([kind, b.dead, damage, blasts, ...misses(w)]).toEqual([kind, true, 0, 0, 1, 0]);
  }
});

test('fade, wipe, ready deletion, lifetime and static mine removal do not invent wall misses', () => {
  for (const options of [
    { kind: 'grow', symbol: 1943, artAlpha: 0 },
    { kind: 'push', symbol: 2221, artAlpha: 0.02 },
    { kind: 'shell', wipe: true },
    { kind: 'shell', readyForDelete: true },
    { kind: 'shell', life: 1 },
    { kind: 'mine', symbol: 2016 },
    { kind: 'whip', symbol: 2036 },
  ] satisfies Partial<Projectile>[]) {
    const w = setup(),
      b = shot(w, { ...options, x: 500 });
    tick(w, b);
    expect(misses(w)).toEqual([0, 0]);
  }
});

test('ricochet reports only its terminal seventh outside event, including hit exemption', () => {
  for (const missExempt of [false, true]) {
    const w = setup(),
      b = shot(w, { kind: 'ricochet', symbol: 1946, missExempt });
    for (let bounce = 1; bounce <= 6; bounce++) {
      b.x = 416;
      b.y = 0;
      b.angle = 0;
      tick(w, b);
      expect(b.bounces).toBe(bounce);
      expect(b.dead).toBe(false);
      expect(b.x).toBeCloseTo(406);
      expect(misses(w)).toEqual([0, 0]);
    }
    b.x = 416;
    tick(w, b);
    expect(b.dead).toBe(true);
    expect(misses(w)).toEqual([missExempt ? 0 : 1, 0]);
  }
});

test('Apocalypse uses stroke-inclusive BF_BG Script width and its constructor miss exemption', () => {
  const w = setup(),
    b = shot(w, { kind: 'apocalypse', symbol: 2058, x: 424, speed: 0 });
  expect(b.missExempt).toBe(true);
  tick(w, b);
  expect(b.detonating).toBeUndefined();
  b.x = 425.25;
  tick(w, b);
  expect(b.detonating).toBeUndefined();
  b.x += 0.001;
  tick(w, b);
  expect(b.detonating).toBe(1);
  expect(misses(w)).toEqual([0, 0]);
  // Raw births (used by regular volleys) receive the same constructor invariant.
  const raw = shot(w, { kind: 'apocalypse', missExempt: undefined });
  w.addBullet(raw);
  expect(raw.missExempt).toBe(true);
});

test('Buster copies only movement, preserving the incoming shot and overwriting the first live-array match', () => {
  const w = setup(),
    b = shot(w, { kind: 'buster', speed: 8 });
  const first = shot(w, {
    enemy: true,
    x: 20,
    angle: 73,
    heading: 69,
    speed: 3,
    life: 45,
    stopped: true,
    detonating: 2,
    artFrame: 6,
    readyForDelete: true,
    dead: true,
  });
  const second = shot(w, { enemy: true });
  w.projectileWidth = () => 20;
  w.bullets = [b, first, second];
  const snapshot = { ...first };
  deflectFirstEnemy(w, b);
  expect(first).toEqual({ ...snapshot, deflected: { x: 8, y: 0 } });
  expect(second.deflected).toBeUndefined();
  b.angle = 90;
  deflectFirstEnemy(w, b);
  expect(first.deflected!.x).toBeCloseTo(0);
  expect(first.deflected!.y).toBe(8);
  first.x = 21.5;
  first.y = 0;
  deflectFirstEnemy(w, b);
  expect(second.deflected!.y).toBe(8); // strict <, first is exactly on the boundary.
});

test('state2 moves before the virtual wall test, skipping all subtype and wipe behavior', () => {
  const w = setup(),
    b = shot(w, {
      kind: 'star',
      symbol: 2028,
      enemy: true,
      x: 410,
      angle: 90,
      speed: 1,
      deflected: { x: 8, y: 0 },
      wipe: true,
    });
  tick(w, b);
  expect([b.x, b.y, b.angle, b.speed, b.enemy, b.dead]).toEqual([418, 0, 90, 1, true, true]);
  expect(misses(w)).toEqual([0, 1]);
  expect(w.runtimeFor(w.field).effectQueue.map((e) => [e.x, e.y])).toEqual([[418, 0]]);
  expect(w.bullets).toEqual([]); // no Starburst split.
});

test('deflected beams and stopped turrets drift past the wall without contacts or expiry', () => {
  for (const kind of ['beam', 'healBeam', 'turret'] as const) {
    const w = setup(),
      b = shot(w, {
        kind,
        owner: -999,
        stopped: kind === 'turret',
        x: 414,
        deflected: { x: 8, y: 2 },
        speed: 0,
        build: 4,
      });
    w.hitProjectile = () => {
      throw new Error('deflection must bypass interception');
    };
    for (let i = 0; i < 10; i++) tick(w, b);
    expect([b.x, b.y, b.dead]).toEqual([494, 20, false]);
    expect(misses(w)).toEqual([0, 0]);
    expect(w.player.shield).toBe(0);
  }
});

test('deflected ricochet expires without bouncing/reporting; moving turrets still report', () => {
  const w = setup(),
    ricochet = shot(w, { kind: 'ricochet', x: 410, bounces: 3, deflected: { x: 8, y: 0 } });
  tick(w, ricochet);
  expect([ricochet.dead, ricochet.bounces]).toEqual([true, 3]);
  expect(misses(w)).toEqual([0, 0]);
  const turret = shot(w, { kind: 'turret', enemy: true, x: 410, deflected: { x: 8, y: 0 } });
  tick(w, turret);
  expect(turret.dead).toBe(true);
  expect(misses(w)).toEqual([0, 1]);
});

test('deflecting an Apocalypse fuse bypasses its collapse poll but retains its movement-enabled wall test', () => {
  const w = setup(),
    b = shot(w, {
      kind: 'apocalypse',
      symbol: 2058,
      x: 425,
      detonating: 53,
      artFrame: 54,
      deflected: { x: 1, y: 0 },
    });
  tick(w, b);
  expect([b.x, b.dead, b.detonating, b.artFrame, w.mode]).toEqual([426, true, 53, 54, 'playing']);
  expect(misses(w)).toEqual([0, 0]);
});

test('turret interception includes Setup movement and the incoming deflected vector', () => {
  for (const deflected of [false, true]) {
    const w = setup(),
      turret = shot(w, {
        kind: 'turret',
        symbol: 2444,
        health: 10,
        origin: { x: 0, y: 0 },
        speed: 10,
      });
    const incoming = shot(w, {
      enemy: true,
      x: 20,
      angle: 90,
      speed: 2,
      damage: 3,
      ...(deflected ? { deflected: { x: 6, y: 0 } } : {}),
    });
    w.addBullet(turret);
    w.addBullet(incoming);
    expect(turret.motion).toEqual({ x: 10, y: 0 });
    const expected = deflected ? { x: 12, y: 0 } : { x: 15, y: -1 };
    w.hitProjectile = (b, x, y) =>
      b === turret && Math.abs(x - expected.x) < 0.001 && Math.abs(y - expected.y) < 0.001;
    tick(w, turret);
    expect(turret.health).toBe(7);
    expect(incoming.dead).toBe(false);
    expect(misses(w)).toEqual([0, 0]);
  }
});

test('a turret retains a dead attached owner until that owner leaves its field collection', () => {
  const w = setup();
  w.player.dead = true;
  const turret = shot(w, { kind: 'turret', symbol: 2444, stopped: true });
  tick(w, turret);
  expect(turret.dead).toBe(false);
  turret.owner = -1;
  tick(w, turret);
  expect(turret.dead).toBe(true);
  expect(misses(w)).toEqual([0, 0]);
});
