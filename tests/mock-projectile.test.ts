import { expect, test } from 'bun:test';
import { AssetPack } from '../src/game/assets/asset-pack';
import { mockProjectileHit, mockProjectilePolygons } from '../src/game/assets/mock-projectile';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { World, emptyInput } from '../src/game/simulation/world';

const basic = (scale = 1) =>
  createProjectile(1, {
    owner: 1,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
    artScale: scale,
  });
const extrema = (points: number[]) => ({
  left: Math.min(...points.filter((_, i) => i % 2 === 0)),
  right: Math.max(...points.filter((_, i) => i % 2 === 0)),
  top: Math.min(...points.filter((_, i) => i % 2 === 1)),
  bottom: Math.max(...points.filter((_, i) => i % 2 === 1)),
});

test('mock basic and heavy cannon shots retain original12px and30px visible diameters and contact', () => {
  const small = basic(),
    heavy = basic(2.5),
    pack = new AssetPack('mock');
  expect(extrema(mockProjectilePolygons(small)![0].points)).toEqual({
    left: -6,
    right: 6,
    top: -6,
    bottom: 6,
  });
  expect(extrema(mockProjectilePolygons(heavy)![0].points)).toEqual({
    left: -15,
    right: 15,
    top: -15,
    bottom: 15,
  });
  expect(pack.projectileBounds(small).width).toBe(12);
  expect(pack.projectileBounds(heavy).width).toBe(30);
  expect(mockProjectileHit(heavy, 14, 0)).toBe(true);
  expect(mockProjectileHit(heavy, 16, 0)).toBe(false);
  expect(mockProjectilePolygons(small)![0].color).toBe(0xd3477c);
});

test('a homing enemy shot can be intercepted outside the former tiny universal mock radius', () => {
  const world = new World([], [], 13);
  world.player.x = -200;
  world.hitTest = () => false;
  const shell = basic(2.5);
  shell.uid = world.nextId();
  shell.owner = world.player.uid;
  const seeker = createProjectile(world.nextId(), {
    owner: 999,
    enemy: true,
    kind: 'seeker',
    symbol: 1809,
    x: 10,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
    targetId: world.player.uid,
  });
  world.addBullet(shell);
  world.addBullet(seeker);
  expect(Math.hypot(seeker.x - shell.x, seeker.y - shell.y)).toBeGreaterThan(shell.radius);
  expect(world.hitProjectile(shell, seeker.x, seeker.y)).toBe(true);
  tickBullet(world, seeker, emptyInput());
  expect(seeker.dead).toBe(true);
  expect(shell.dead).toBe(false);
  expect(world.runtimeFor(world.field).effectQueue).toHaveLength(1);
});

test('mock painted contours and collision update together when a retained shot moves or scales', () => {
  const b = basic();
  const first = mockProjectilePolygons(b);
  expect(mockProjectilePolygons(b)).toBe(first);
  b.x = 100;
  b.y = 50;
  b.artScale = 2.5;
  expect(mockProjectileHit(b, 110, 50)).toBe(true);
  expect(mockProjectileHit(b, 0, 0)).toBe(false);
  expect(extrema(mockProjectilePolygons(b)![0].points)).toEqual({
    left: 85,
    right: 115,
    top: 35,
    bottom: 65,
  });
  b.artScale = 1;
  expect(mockProjectileHit(b, 110, 50)).toBe(false);
});

test('empty authored Flak frames have neither mock painting nor point contact', () => {
  const world = new World([], [], 13);
  const flak = createProjectile(world.nextId(), {
    owner: 1,
    enemy: false,
    kind: 'flak',
    symbol: 2031,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 0,
  });
  world.addBullet(flak);
  world.pause();
  for (let i = 0; i < 40; i++) world.step(emptyInput());
  expect(flak.artFrame).toBe(23);
  expect(mockProjectilePolygons(flak)).toEqual([]);
  expect(mockProjectileHit(flak, 0, 0)).toBe(false);
});

test('procedural beam paint and contact honor their dynamic mask instead of an unbounded line leaf', () => {
  const b = createProjectile(1, {
    owner: 1,
    enemy: false,
    kind: 'beam',
    symbol: 1992,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
    beamLength: 40,
  });
  const polygons = mockProjectilePolygons(b)!;
  expect(polygons.length).toBeGreaterThan(0);
  expect(Math.max(...polygons.map((p) => extrema(p.points).right))).toBeLessThan(100);
  expect(mockProjectileHit(b, 20, 0)).toBe(true);
  expect(mockProjectileHit(b, 500, 0)).toBe(false);
});
