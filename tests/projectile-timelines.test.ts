import { expect, test } from 'bun:test';
import { AssetPack } from '../src/game/assets/asset-pack';
import { STARTER } from '../src/game/data/catalog';
import scripts from '../src/game/data/timeline-scripts.json';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { ProjectileTimelines } from '../src/game/simulation/projectile-timelines';
import { whipSamples } from '../src/game/simulation/whip';
import { World, emptyInput } from '../src/game/simulation/world';

function bullet(kind: 'grow' | 'flak' | 'whip' | 'sapper') {
  return createProjectile(1, {
    owner: 1,
    enemy: false,
    kind,
    symbol: { grow: 1943, flak: 2031, whip: 2036, sapper: 1831 }[kind],
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
  });
}

test('effective frame registrations preserve Whip super overwrite and inherited projectile starts', () => {
  for (const id of [1943, 2031, 2036, 1831, 1792, 2182, 2178])
    expect((scripts as Record<number, unknown>)[id]).toBeDefined();
  expect(scripts['2036']['1']).toEqual(scripts['1943']['1']);
  expect(scripts['2036']['1'].type).toBe('random-jump');
  expect(scripts['2031']['23']).toEqual({ type: 'stop' });
  expect((scripts['2036'] as Record<string, unknown>)['31']).toBeUndefined();
  const b = bullet('whip');
  new ProjectileTimelines(() => 0.5).initialize(b);
  expect(b.artFrame).toBe(5); // A derived stop table would have left this at1.
});

test('Grow constructor chooses rounded1..20 before the inherited frame1 callback', () => {
  let draws = 0;
  const b = bullet('grow');
  const clocks = new ProjectileTimelines(() => {
    draws++;
    return 0.5;
  });
  clocks.initialize(b);
  expect([b.artFrame, draws]).toEqual([11, 1]);
  clocks.initialize(b);
  expect(draws).toBe(1);
  clocks.advance(b);
  expect([b.artFrame, b.age, b.artScale, b.artAlpha ?? 1]).toEqual([12, 0, 1, 1]);
  const start = bullet('grow');
  const random = [0, 0.9];
  new ProjectileTimelines(() => random.shift()!).initialize(start);
  expect(start.artFrame).toBe(9); // Constructor1 enters the inherited base random frame.
});

test('Whip root31 and main child30 retain independent playback, including across parent seek', () => {
  const b = bullet('whip');
  const clocks = new ProjectileTimelines(() => 0.5);
  const root = clocks.initialize(b)!;
  const main = root.children.get(15)!.clip;
  const initial = whipSamples(b);
  for (let i = 0; i < 5; i++) clocks.advance(b);
  expect([root.frame, main.frame]).toEqual([10, 6]);
  expect(root.children.get(15)!.clip).toBe(main);
  expect(whipSamples(b)).not.toEqual(initial);
  root.gotoAndPlay(20);
  expect(main.frame).toBe(6);
  clocks.advance(b);
  expect([root.frame, main.frame]).toEqual([21, 7]);
  for (let i = 0; i < 11; i++) clocks.advance(b);
  expect(root.frame).toBe(5); // Wrap enters frame1 and reruns the inherited random start.
});

test('Sapper stopped roots retain advancing children and a frame switch replaces only removed depths', () => {
  const b = bullet('sapper');
  const clocks = new ProjectileTimelines(() => 0.5);
  const root = clocks.initialize(b)!;
  const child = root.children.get(1)!.clip;
  for (let i = 0; i < 5; i++) clocks.advance(b);
  expect([root.frame, child.frame]).toEqual([3, 6]);
  clocks.hold(b, 2);
  expect(b.artFrame).toBe(2);
  const switched = [...root.children.values()].map((entry) => entry.clip.frame);
  clocks.advance(b);
  expect(root.frame).toBe(2);
  expect([...root.children.values()].map((entry) => entry.clip.frame)).not.toEqual(switched);
});

test('deflected Flak keeps its stage clock while bypassing frame-polled damage/removal', () => {
  const world = new World([], [], 13);
  world.player.design = { ...STARTER };
  const b = bullet('flak');
  b.deflected = { x: 0.1, y: 0 };
  world.addBullet(b);
  world.explode = () => {
    throw new Error('Deflection bypasses Flak MoveBullet');
  };
  for (let i = 0; i < 40; i++) world.step(emptyInput());
  expect([b.artFrame, b.dead, b.age]).toEqual([23, false, 40]);
  b.deflected = undefined;
  world.step(emptyInput());
  expect(b.dead).toBe(true);
});

test('empty retained frames remove fallback pixel contact and rectangle geometry', () => {
  const b = bullet('flak');
  const clocks = new ProjectileTimelines(() => 0.5);
  clocks.initialize(b);
  for (let i = 0; i < 30; i++) clocks.advance(b);
  const pack = new AssetPack('mock');
  expect(b.artPose!.placements).toHaveLength(0);
  expect(pack.hitProjectile(b, b.x, b.y)).toBe(false);
  expect(pack.projectileBounds(b)).toEqual({ x: 0, y: 0, width: 0, height: 0, empty: true });
});
