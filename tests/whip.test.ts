import { expect, test } from 'bun:test';
import { SwfClip, type ClipSource } from '../src/game/assets/swf-clip';
import type { DisplayPlacement, SwfMatrix } from '../src/game/assets/asset-pack';
import type { GunState, Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { createTank } from '../src/game/simulation/tank';
import { tickWhip, whipSamples } from '../src/game/simulation/whip';
import { World } from '../src/game/simulation/world';

const identity: SwfMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
function placement(
  depth: number,
  charId: number,
  matrix: SwfMatrix = identity,
  name?: string,
): DisplayPlacement {
  return { depth, charId, matrix, name, frame: 1, bornFrame: 1 };
}
function pose(
  samples: (frame: number) => { x: number; y: number }[] = () => [{ x: 0, y: 0 }],
  matrix = identity,
) {
  const source: ClipSource = {
    spriteInfo: (id) =>
      id === 10000 ? { frameCount: 31 } : id === 10001 ? { frameCount: 30 } : undefined,
    displayList: (id, frame) =>
      id === 10000
        ? [placement(1, 10002), placement(15, 10001, matrix, 'whip_mc')]
        : id === 10001
          ? samples(frame).map((point, i) =>
              placement(i + 1, 10003, { ...identity, tx: point.x * 20, ty: point.y * 20 }),
            )
          : [],
  };
  const result = new SwfClip(10000, source);
  result.advance(1);
  return result;
}
function setup(artPose = pose(), values: Partial<Projectile> = {}) {
  const world = new World([], [], 8);
  world.hitTest = () => false;
  const anchor: GunState = {
    part: { ...STARTER.parts[1], type: 3014 },
    counter: 90,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  const b = createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'whip',
    symbol: 2036,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 30,
    artScale: 1,
    anchor,
    artPose,
    ...values,
  });
  world.projectileTimelines.initialize = () => artPose;
  world.projectileTimelines.totalFrames = () => 31;
  world.muzzle = () => ({ x: b.x, y: b.y });
  return { world, b, artPose };
}
function enemy(world: World, x = 0) {
  const tank = createTank(world.nextId(), { ...STARTER, life: 200 }, 'enemy', x, 0);
  world.field.enemies.push(tank);
  return tank;
}
const queue = (world: World) => world.runtimeFor(world.field).effectQueue;

test('primary child registration points use retained child frame and composed authored transform', () => {
  const retained = pose((frame) => [{ x: frame, y: 3 }], {
    a: 0,
    b: 2,
    c: -3,
    d: 0,
    tx: 200,
    ty: 400,
  });
  retained.advance(2);
  retained.gotoAndPlay(12); // Parent seek does not make the surviving child frame12.
  const { b } = setup(retained, { x: 100, y: 200, angle: 90, artScale: undefined, age: 999 });
  const points = whipSamples(b);
  expect(retained.frame).toBe(12);
  expect(retained.children.get(15)!.clip.frame).toBe(2);
  expect(points).toHaveLength(1); // The ghost artwork at depth1 is not sampled.
  expect(points[0].x).toBeCloseTo(70);
  expect(points[0].y).toBeCloseTo(201.25);
});

test('enemy array priority wins over sample priority and each enemy is hit only once', () => {
  const { world, b } = setup(
    pose(() => [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]),
  );
  const first = enemy(world, 10),
    second = enemy(world, 0);
  world.hitTest = (tank, x) => x === tank.x;
  tickWhip(world, b);
  expect([first.life, second.life]).toEqual([170, 200]);
  tickWhip(world, b);
  expect([first.life, second.life]).toEqual([170, 170]);
  tickWhip(world, b);
  expect([first.life, second.life, b.hit.size]).toEqual([170, 170, 2]);
  expect(queue(world)).toHaveLength(2);
  expect(b.dead).toBe(false);
});

test('contact uses the previous attachment, then follows the emitter without rotating or jam deletion', () => {
  const { world, b } = setup(
    pose(() => [{ x: 4, y: 0 }]),
    { angle: 90 },
  );
  const target = enemy(world);
  world.player.status.jam = 50;
  world.player.rotation = 130;
  b.anchor!.angle = 45;
  world.muzzle = () => ({ x: 100, y: 200 });
  world.hitTest = (tank, x, y) => tank === target && Math.abs(x) < 0.001 && y === 4;
  tickWhip(world, b);
  expect(target.life).toBe(170);
  expect([b.x, b.y, b.angle, b.dead]).toEqual([100, 200, 90, false]);
});

test('damage precedes remembering the hit and the impact uses the authored global queue quirk', () => {
  const { world, b } = setup(
    pose(() => [{ x: 10, y: 5 }]),
    { x: 20, y: 30 },
  );
  const target = enemy(world);
  world.player.x = 7;
  world.player.y = 11;
  world.viewZoom = 2;
  const samples: [number, number][] = [];
  world.hitTest = (tank, x, y) => {
    samples.push([x, y]);
    return tank === target;
  };
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    expect(b.hit.has(tank.uid)).toBe(false);
    expect(queue(world)).toHaveLength(0);
    damage(tank, amount, bullet);
  };
  tickWhip(world, b);
  expect(samples).toEqual([[30, 35]]);
  expect(b.hit.has(target.uid)).toBe(true);
  expect(queue(world).map((effect) => [effect.symbol, effect.x, effect.y])).toEqual([
    [1723, 321, 273],
  ]);
});

test('last authored frame expires before contact or emitter follow regardless of active age', () => {
  const { world, b, artPose } = setup();
  const target = enemy(world);
  world.hitTest = () => true;
  world.muzzle = () => {
    throw new Error('expired whip must not follow its emitter');
  };
  artPose.gotoAndPlay(31);
  tickWhip(world, b);
  expect(b.dead).toBe(true);
  expect(target.life).toBe(200);
  expect(b.age).toBe(0);
  expect(queue(world)).toHaveLength(0);
});

test('stage progression through pause is polled at its current frame, without elapsed-frame expiry', () => {
  const { world, b, artPose } = setup();
  world.pause();
  // The shared stage clock advances the retained pose while gameplay does not call tickWhip.
  artPose.advance(34);
  expect(artPose.frame).toBe(3);
  world.resume();
  tickWhip(world, b);
  expect(b.dead).toBe(false); // It passed31 during pause and already looped.
  artPose.advance(62);
  expect(artPose.frame).toBe(31);
  tickWhip(world, b);
  expect(b.dead).toBe(true);
});

test('missing owners retain their last position until authored expiry', () => {
  const { world, b, artPose } = setup(pose(), { owner: -100, x: 12, y: 34 });
  tickWhip(world, b);
  expect([b.x, b.y, b.dead]).toEqual([12, 34, false]);
  artPose.gotoAndPlay(31);
  tickWhip(world, b);
  expect(b.dead).toBe(true);
});
