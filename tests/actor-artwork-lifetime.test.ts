import { expect, test } from 'bun:test';
import { AssetPack, type SpriteInfo } from '../src/game/assets/asset-pack';
import { STARTER } from '../src/game/data/catalog';
import metadata from '../src/game/data/mock-part-timelines.json';
import type { Tank, TankDesign } from '../src/game/core/types';
import { createTank } from '../src/game/simulation/tank';
import { removeTankChild, addTankChild } from '../src/game/simulation/tank-display';
import { World, emptyInput } from '../src/game/simulation/world';
import { setFieldFixtureLayout } from './fixtures/field-layout';
import { cacheEmptyField } from './fixtures/empty-field';

const design: TankDesign = {
  ...STARTER,
  avatar: false,
  speed: 0,
  parts: [1501, 1501, 4015].map((type, i) => ({
    ...STARTER.parts[0],
    key: `mount-${i}`,
    type,
    x: i === 2 ? 30 : 0,
    y: i === 0 ? -20 : i === 1 ? 20 : 0,
    scale: 1,
    rotation: 0,
  })),
};
function setup() {
  const world = new World([], [], 47),
    pack = new AssetPack('mock');
  Object.assign(pack, {
    sprites: new Map((metadata.sprites as SpriteInfo[]).map((s) => [s.id, s])),
  });
  const make = (uid = world.nextId()) =>
    createTank(uid, design, 'enemy', 0, 0, undefined, undefined, world);
  const pose = (tank: Tank, index = 0) => pack.partClip(tank, tank.design.parts[index]);
  return { world, pack, make, pose };
}
function art(world: World, frames: number) {
  for (let i = 0; i < frames; i++) world.advanceArtwork();
}

test('source Wiggle root windows continue through actual departure, cached absence and revisit', () => {
  const { world, make, pose } = setup(),
    home = world.field,
    tank = make();
  home.cleared = false;
  home.enemies = [tank];
  world.attachActor(tank, home);
  const negative = pose(tank),
    positive = pose(tank, 1);
  cacheEmptyField(world);
  art(world, 110);
  expect(negative.frame).toBe(12); // Actual EXIT110; original ENTER111 advances to13.
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(world.cache.get(0, 0)!.enemies[0].tank).toBe(tank);
  expect(world.actorParents.hasParent(tank)).toBe(true);
  expect(world.actorParents.onStage(tank)).toBe(false);
  const age = tank.age;
  art(world, 38);
  expect([tank.artAge, negative.frame, positive.frame]).toEqual([149, 2, 52]);
  art(world, 50);
  expect(negative.frame).toBe(3); // Actual EXIT199, before ENTER200 advances to4.
  world.jump({ x: -1, y: 0 });
  const restored = world.transit!.next;
  expect(restored).not.toBe(home);
  expect(restored.enemies[0]).toBe(tank);
  expect(pose(tank)).toBe(negative);
  expect(pose(tank, 1)).toBe(positive);
  expect(negative.frame).toBe(3);
  expect(tank.age).toBe(age);
  expect(world.actorParents.inField(tank, restored)).toBe(true);
});

test('retained direct removal advances by object identity, including dead and array-only references', () => {
  const { world, make, pose } = setup(),
    first = make(77),
    twin = make(77);
  expect(first.uid).toBe(twin.uid);
  expect(first.design).toBe(twin.design);
  world.attachActor(first, world.field);
  world.attachActor(twin, world.field);
  const a = pose(first),
    b = pose(twin);
  art(world, 6);
  world.actorParents.detach(first);
  first.dead = true; // A flag does not destroy retained mounted instances.
  world.field.enemies = [first];
  art(world, 8);
  expect([first.artAge, twin.artAge, a.frame, b.frame]).toEqual([14, 14, 14, 14]);
  expect([first.age, twin.age]).toEqual([0, 0]);
  world.attachActor(first, world.field);
  expect(pose(first)).toBe(a);
  expect(a).not.toBe(b);
  expect(a.frame).toBe(14);
});

test('directly removed stopped rotor retains its current independently ticking child without reads', () => {
  const { world, make, pose } = setup(),
    tank = make();
  world.attachActor(tank, world.field);
  const root = pose(tank, 2),
    child = root.children.get(1)!;
  expect(child.clip.id).toBe(34);
  expect(metadata.sprites.find((sprite) => sprite.id === child.clip.id)!.frameCount).toBe(40);
  expect(root.frame).toBe(1);
  const age = child.clip.age,
    frame = child.clip.frame;
  removeTankChild(tank, 'part:mount-2');
  art(world, 9);
  expect(root.frame).toBe(1);
  expect(child.clip.age).toBe(age + 9);
  expect(child.clip.frame).not.toBe(frame);
  expect([...root.children.values()]).toContain(child);
  addTankChild(tank, 'part:mount-2');
  expect(pose(tank, 2)).toBe(root);
  expect([...root.children.values()]).toContain(child);
  expect(child.clip.age).toBe(age + 9);
});

test('raw array replacements and physical reattachment are neither constructor nor clock ownership', () => {
  const { world, make, pose } = setup(),
    tank = make(),
    raw = createTank(tank.uid, design, 'enemy');
  const clip = pose(tank);
  world.field.enemies = [raw];
  art(world, 7);
  expect([tank.artAge, raw.artAge]).toEqual([7, 0]);
  world.actorArtwork.construct(tank); // Repeated explicit ownership is not a new epoch.
  world.attachActor(tank, world.field);
  world.attachActor(tank, world.field);
  world.field.enemies = [];
  art(world, 4);
  expect([tank.artAge, raw.artAge, clip.frame]).toEqual([11, 0, 11]);
  expect(pose(tank)).toBe(clip);
});

test('before-ENTER and inside-ENTER construction preserve the measured 1/2/3 and 1/1/2 cohorts', () => {
  const { world, make, pose } = setup(),
    before = make();
  world.attachActor(before, world.field);
  let inside: Tank | undefined;
  const samples: number[] = [],
    insideSamples: number[] = [];
  world.onUpgradeMenuOpen = () => {
    inside = make();
    world.attachActor(inside, world.field);
    insideSamples.push(pose(inside).frame);
  };
  world.player.life = 50;
  const advanceTime = world.advanceTime.bind(world);
  world.advanceTime = (ms) => {
    samples.push(pose(before).frame);
    if (inside) insideSamples.push(pose(inside).frame);
    advanceTime(ms);
  };
  for (let i = 0; i < 3; i++) world.step(emptyInput());
  expect(samples).toEqual([1, 2, 3]);
  expect(insideSamples).toEqual([1, 1, 2]);
  expect([before.artAge, inside!.artAge]).toEqual([3, 2]);
  const windows = [111, 150, 200, 220, 221, 331, 400, 440, 441, 550];
  const beforeFrames: number[] = [],
    insideFrames: number[] = [];
  let enter = 4;
  world.advanceTime = (ms) => {
    if (windows.includes(enter)) {
      beforeFrames.push(pose(before).frame);
      insideFrames.push(pose(inside!).frame);
    }
    advanceTime(ms);
  };
  for (; enter <= 550; enter++) world.step(emptyInput());
  // Literal deterministic negative-Y windows from both original captures; no
  // original random bubble frame or RNG stream is fitted to this host playback.
  expect(beforeFrames).toEqual([13, 3, 4, 24, 25, 37, 8, 48, 49, 11]);
  expect(insideFrames).toEqual([12, 2, 3, 23, 24, 36, 7, 47, 48, 10]);
});

test('replaced avatars retained by a callback continue without gameplay RNG, timer or UID work', () => {
  const { world, pose } = setup(),
    old = world.player,
    retained = () => old;
  const root = pose(old);
  world.editPlayer(STARTER);
  const current = world.player,
    rng = world.rng.state;
  const nextId = world.nextId();
  world.hitSoundTimer = 8;
  art(world, 7);
  expect(retained()).toBe(old);
  expect([old.artAge, current.artAge, root.age]).toEqual([7, 7, 7]);
  expect([old.age, current.age, world.stats.frames, world.hitSoundTimer]).toEqual([0, 0, 0, 8]);
  expect(world.rng.state).toBe(rng);
  expect(world.nextId()).toBe(nextId + 1);
  expect(pose(old)).toBe(root);
});
