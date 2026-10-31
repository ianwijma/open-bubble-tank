import { expect, test } from 'bun:test';
import { AssetPack, type SpriteInfo } from '../src/game/assets/asset-pack';
import { ClipTimeline } from '../src/game/assets/clip-timeline';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { massiveChargeFrame } from '../src/game/core/mounted-art';
import mockData from '../src/game/data/mock-part-timelines.json';

const matrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const sprites: SpriteInfo[] = [
  {
    id: 721,
    frameCount: 1,
    placements: [{ charId: 720, depth: 19, name: 'bullet_mc', matrix, frame: 1 }],
  },
  { id: 720, frameCount: 27, placements: [{ charId: 718, depth: 1, matrix, frame: 2 }] },
];
function setup() {
  const pack = new AssetPack('swf');
  Object.assign(pack, { sprites: new Map(sprites.map((s) => [s.id, s])) });
  const world = new World([], [], 1);
  world.field.enemies = [];
  world.player = createTank(
    991,
    {
      ...STARTER,
      parts: [0, 1].map((i) => ({
        ...STARTER.parts[1],
        type: 3008,
        key: `massive-${i}`,
      })),
    },
    'player',
  );
  const tank = world.player;
  const pose = (index = 0) => pack.partClip(tank, tank.guns[index].part).children.get(19)!.clip;
  const fire = (index = 0) => world.fireGun(tank, tank.guns[index], emptyInput());
  return { pack, world, tank, pose, fire };
}

test('play resumes a stopped script without rerunning it or restarting an active frame', () => {
  const clip = new ClipTimeline(27, { 1: { type: 'stop' } });
  clip.tick();
  clip.play();
  expect(clip.frame).toBe(1);
  expect(clip.playing).toBe(true);
  expect(clip.tick()).toBe(2);
  clip.play();
  expect(clip.frame).toBe(2);
  for (let i = 0; i < 26; i++) clip.tick();
  expect(clip.frame).toBe(1);
  expect(clip.playing).toBe(false);
});

test('mock charge uses the shared mounted timeline and removes particles on frame27', () => {
  const mock = new AssetPack('mock');
  Object.assign(mock, { sprites: new Map(mockData.sprites.map((s) => [s.id, s])) });
  const { tank, fire } = setup(),
    part = tank.guns[0].part;
  const charge = mock.partClip(tank, part).children.get(19)!.clip;
  expect(charge.placements).toHaveLength(0);
  fire();
  tank.artAge = 1;
  mock.partClip(tank, part);
  expect(charge.frame).toBe(2);
  expect(charge.placements.length).toBeGreaterThan(0);
  tank.artAge = 26;
  mock.partClip(tank, part);
  expect(charge.frame).toBe(27);
  expect(charge.placements).toHaveLength(0);
  tank.artAge = 27;
  mock.partClip(tank, part);
  expect(charge.frame).toBe(1);
});

test('each mount resumes after its initialized frame1 and lazy/dense reads agree', () => {
  const sparse = setup(),
    dense = setup();
  sparse.fire();
  dense.fire();
  for (let age = 0; age <= 26; age++) {
    dense.tank.artAge = age;
    expect(dense.pose().frame).toBe(age + 1);
    expect(massiveChargeFrame(dense.tank.guns[0], age)).toBe(age + 1);
  }
  sparse.tank.artAge = 26;
  expect(sparse.pose().frame).toBe(dense.pose().frame);
  expect(sparse.pose(1).frame).toBe(1);
  sparse.tank.artAge = 27;
  expect(sparse.pose().frame).toBe(1);
  expect(massiveChargeFrame(sparse.tank.guns[0], 27)).toBe(1);
  sparse.fire(1);
  sparse.tank.artAge = 30;
  expect([sparse.pose().frame, sparse.pose(1).frame]).toEqual([1, 4]);
});

test('overlapping play calls preserve phase, later episodes catch up and new tanks start idle', () => {
  const { pack, tank, pose, fire } = setup();
  fire();
  tank.artAge = 10;
  fire();
  expect(tank.guns[0].mountedPlay?.age).toBe(1);
  expect(pose().frame).toBe(11);
  tank.artAge = 200;
  fire(); // Previous loop is idle, even if nobody rendered its completion.
  tank.artAge = 205;
  expect(pose().frame).toBe(6);
  const late = setup();
  late.tank.guns[0].mountedPlay = tank.guns[0].mountedPlay;
  late.tank.artAge = 205;
  expect(late.pose().frame).toBe(6);
  const replacement = createTank(992, tank.design, 'player');
  expect(pack.partClip(replacement, replacement.guns[0].part).children.get(19)!.clip.frame).toBe(1);
  // A rewound query reconstructs instead of retaining the later episode's pose.
  tank.artAge = 202;
  expect(pose().frame).toBe(3);
});

test('pause and crossing keep mounted art advancing while forcefield copies stay idle', () => {
  const { pack, world, tank, fire, pose } = setup();
  fire();
  world.pause();
  for (let i = 0; i < 8; i++) world.step(emptyInput());
  expect([tank.age, tank.artAge, pose().frame]).toEqual([0, 8, 9]);
  const clone = pack.forcefieldPartClip(tank, tank.guns[0].part);
  expect(clone.children.get(19)!.clip.frame).toBe(1);
  world.resume();
  world.jump({ x: 1, y: 0 });
  for (let i = 0; i < 3; i++) world.step(emptyInput());
  expect(tank.artAge).toBe(11);
  expect(pose().frame).toBe(12);
  expect(tank.guns[0].mountedPlay?.age).toBe(1);
});
