import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { spawnPickups, tickPickups } from '../src/game/simulation/pickups';
import { clearPickups, PickupChildRemovalError } from '../src/game/simulation/pickup-display';
import { Random } from '../src/game/core/math';

const children = (world: World, field = world.field) => [...world.pickupDisplays.owned(field)];
function born(amount = 6) {
  const world = new World([], [], 31);
  spawnPickups(world, { x: 200, y: 100 }, amount);
  world.hitTest = () => false;
  return world;
}

test('SpawnLifeBubbles attaches original objects before Setup and Run append, then forces collection', () => {
  const world = new World([], [], 31);
  const seen: unknown[] = [];
  const attach = world.pickupDisplays.attach.bind(world.pickupDisplays);
  world.pickupDisplays.attach = (pickup, field) => {
    seen.push([
      pickup.x,
      pickup.y,
      pickup.value,
      pickup.forced,
      world.pickups.includes(pickup),
      world.pickupDisplays.read(pickup)?.avatar,
    ]);
    attach(pickup, field);
  };
  spawnPickups(world, { x: 21, y: 42 }, 55, world.pickups, true);
  expect(seen).toEqual([
    [21, 42, 1, false, false, null],
    [21, 42, 1, false, false, null],
    [21, 42, 1, false, false, null],
  ]);
  expect(children(world)).toEqual(world.pickups);
  expect(world.pickups.map((p) => p.value)).toEqual([50, 5, 1]);
  for (const p of world.pickups) {
    expect(world.pickupDisplays.read(p)?.avatar).toBe(world.player);
    expect(world.pickupDisplays.read(p)?.callbackField).toBe(world.field);
    expect(p.forced).toBe(true);
    expect(p.scattering).toBe(false);
  }
});

test('construction preserves speed/rotation RNG and UID streams without borrowing native frame-script entropy', () => {
  const world = new World([], [], 31),
    control = new Random(1);
  control.state = world.rng.state;
  const uid = world.nextId();
  const expected = Array.from({ length: 3 }, () => [control.int(4, 22), control.int(-180, 180)]);
  spawnPickups(world, { x: 200, y: 0 }, 55);
  expect(world.rng.state).toBe(control.state);
  world.pickups.forEach((p, index) => {
    expect(p.uid).toBe(uid + index + 1);
    expect(p.rotation).toBe(expected[index][1]);
    expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(expected[index][0]);
  });
  expect(world.nextId()).toBe(uid + 4);
});

test('Run replacement, reordering, duplicates, value writes and dead flags cannot reconstruct physical children', () => {
  const world = born(),
    [a, b] = world.pickups;
  const original = world.pickupDisplays.read(a)!;
  world.pickups = [b, a, a];
  a.dead = true;
  a.value = 50;
  expect(children(world)).toEqual([a, b]);
  expect(world.pickupDisplays.read(a)?.symbol).toBe(1817);
  world.pickups = [];
  expect(children(world)).toEqual([a, b]);
  expect(world.pickupDisplays.read(a)?.clip).toBe(original.clip);
});

test('raw Run entries never become production display children during reads, stage ticks or Run', () => {
  const world = born(1),
    a = world.pickups[0],
    raw = { ...a };
  world.pickups = [raw];
  world.advanceArtwork();
  tickPickups(world);
  expect(children(world)).toEqual([a]);
  expect(world.pickupDisplays.read(raw)).toBeUndefined();
});

test('addChild reorders/reparents actual objects and duplicate UIDs do not alias clip lifetimes', () => {
  const world = born(),
    old = world.field,
    [a, b] = world.pickups;
  const twin = { ...a };
  const clip = world.pickupDisplays.construct(twin, 5);
  world.pickupDisplays.attach(twin, old);
  world.pickupDisplays.attach(a, old);
  expect(children(world)).toEqual([b, twin, a]);
  expect(world.pickupDisplays.read(a)?.clip).not.toBe(clip);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  world.pickupDisplays.attach(a, next);
  expect(children(world, old)).toEqual([b, twin]);
  expect(children(world, next)).toEqual([a]);
  expect(world.pickupDisplays.read(a)?.callbackField).toBe(old);
});

test('collection explicitly removes the actual child and retains its original detached lifetime', () => {
  const world = born(),
    [a, b] = world.pickups;
  const clip = world.pickupDisplays.read(a)!.clip;
  a.collected = true;
  tickPickups(world);
  expect(world.pickups).toEqual([b]);
  expect(children(world)).toEqual([b]);
  expect(world.pickupDisplays.read(a)?.parent).toBeNull();
  expect(world.pickupDisplays.read(a)?.clip).toBe(clip);
  expect(world.stats.collected).toBe(1);
});

test('outside callback splices before physical removal and defers the next Run entry', () => {
  const world = born(),
    [a, b] = world.pickups;
  a.x = 1000;
  const x = b.x;
  tickPickups(world);
  expect(children(world)).toEqual([b]);
  expect(world.pickups).toEqual([b]);
  expect(b.x).toBe(x);
});

test('bulk cleanup walks the Run vector; array-removed display-only children survive', () => {
  const world = born(),
    [a, b] = world.pickups;
  world.pickups = [b];
  clearPickups(world, world.field);
  expect(world.pickups).toEqual([]);
  expect(children(world)).toEqual([a]);
  expect(world.pickupDisplays.read(b)?.parent).toBeNull();
});

test('stale callbacks retain source splice-before-removeChild failure instead of removing a new parent', () => {
  const world = born(1),
    old = world.field,
    a = world.pickups[0];
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  world.pickupDisplays.attach(a, next);
  a.x = 1000;
  expect(() => tickPickups(world)).toThrow(PickupChildRemovalError);
  expect(world.runtimeFor(old).pickups).toEqual([]);
  expect(children(world, next)).toEqual([a]);
});

test('playback separates source registration and authored preview from an unresolved native frame', () => {
  const world = born(55);
  const clips = world.pickups.map((p) => world.pickupDisplays.read(p)!.clip);
  expect(clips.map((c) => [c.symbol, c.totalFrames, c.registersFrame1])).toEqual([
    [1820, 31, false],
    [1817, 40, true],
    [1816, 40, true],
  ]);
  for (const clip of clips) {
    expect(clip.playback.status).toBe('unresolved');
    expect(clip.playback.currentFrame).toBeNull();
    expect(clip.presentation).toEqual({ kind: 'held-authored-preview', frame: 1 });
  }
  const rng = world.rng.state;
  world.pause();
  for (let i = 0; i < 60; i++) world.step(emptyInput());
  expect(world.pickups.map((p) => world.pickupDisplays.read(p)!.clip)).toEqual(clips);
  expect(world.rng.state).toBe(rng);
  expect(clips.every((clip) => clip.playback.currentFrame === null)).toBe(true);
});

test('completed outgoing Deactivate removes Run children before wrapper detachment', () => {
  const world = born(1),
    old = world.field,
    a = world.pickups[0];
  world.fieldVisit.completed = true;
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.step(emptyInput());
  expect(world.currentWrapper).not.toBe(old);
  expect(children(world, old)).toEqual([]);
  expect(world.pickupDisplays.read(a)?.parent).toBeNull();
});

test('uncleared outgoing wrapper retains life children; revisit creates a fresh empty life layer', () => {
  const world = born(1),
    old = world.field,
    a = world.pickups[0];
  world.fieldVisit.completed = false;
  world.jump({ x: 1, y: 0 });
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.step(emptyInput());
  expect(children(world, old)).toEqual([a]);
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next).not.toBe(old);
  expect(children(world, world.transit!.next)).toEqual([]);
  expect(world.pickupDisplays.read(a)?.parent).toBe(old);
});

test('fixture bootstrap supplies omitted births once and never repairs an explicitly removed child', async () => {
  const { importPickupFixtures } = await import('./fixtures/pickup-attachments');
  const world = born(1),
    existing = world.pickups[0],
    raw = { ...existing };
  world.pickups.push(raw);
  importPickupFixtures(world);
  expect(children(world)).toEqual([existing, raw]);
  world.pickupDisplays.remove(raw, world.field);
  importPickupFixtures(world);
  expect(children(world)).toEqual([existing]);
  expect(world.pickupDisplays.read(raw)?.parent).toBeNull();
});
