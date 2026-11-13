import { setFieldFixtureLayout } from '../tools/fixtures/field-layout';
import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';
import { displayMatrixPoint } from '../src/game/core/display-transform';

test('World siblings retain distinct identities; top/screen use the actual engine layer identities', () => {
  const world = new World([], [], 1),
    field = world.currentWrapper;
  const bullet = world.worldDisplays.read(field, 'bullet');
  const top = world.worldDisplays.read(field, 'top');
  const highlight = world.worldDisplays.read(field, 'highlight');
  const screen = world.worldDisplays.read(undefined, 'screen');
  expect(top.identity).toBe(world.effectEngine.layer(field, 'top')!);
  expect(screen.identity).toBe(world.effectEngine.screen);
  expect(new Set([bullet.identity, top.identity, highlight.identity, screen.identity]).size).toBe(
    4,
  );
  for (const layer of [bullet, top, highlight, screen]) {
    expect(layer.pose).toMatchObject({ x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1 });
    expect(layer.parent).toBe('world');
    expect(layer.rooted).toBe(true);
  }
  expect(Object.isFrozen(top)).toBe(true);
  expect(Object.isFrozen(top.pose.matrix)).toBe(true);
});

test('next bullet/top copy outgoing position at birth; highlight copies next root and future wave scale', () => {
  const world = new World([], [], 2),
    current = world.currentWrapper;
  world.cache.store({
    col: 1,
    row: 0,
    scale: 1.2,
    enemies: [],
    cleared: false,
    boss: false,
    tutorial: 0,
  });
  world.step({ ...emptyInput(), right: true });
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  const from = world.fieldDisplays.read(current).root.pose;
  const to = world.fieldDisplays.read(next).root.pose;
  expect(to.x).not.toBe(from.x);
  for (const kind of ['bullet', 'top'] as const) {
    expect(world.worldDisplays.read(next, kind).pose).toMatchObject({
      x: from.x,
      y: from.y,
      scaleX: 1,
      scaleY: 1,
    });
  }
  expect(world.worldDisplays.read(next, 'highlight').pose).toMatchObject({
    x: to.x,
    y: to.y,
    scaleX: 1.2,
    scaleY: 1.2,
  });
  expect(world.worldDisplays.read(next, 'highlight').pose.matrix.a).toBe(1.2000000476837158);
  world.step(emptyInput());
  const moved = world.fieldDisplays.read(next).root.pose;
  for (const kind of ['bullet', 'top', 'highlight'] as const)
    expect(world.worldDisplays.read(next, kind).pose).toMatchObject({ x: moved.x, y: moved.y });
});

test('superseded next siblings stay rooted at their actual last poses', () => {
  const world = new World([], [], 3);
  cacheEmptyField(world, 1);
  cacheEmptyField(world, 2);
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  const orphan = world.transit!.next;
  const before = world.worldDisplays.read(orphan, 'bullet');
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  expect(world.fieldDisplays.read(orphan).phase).toBe('orphaned');
  expect(world.worldDisplays.read(orphan, 'bullet')).toEqual(before);
  expect(world.worldDisplays.read(orphan, 'top').rooted).toBe(true);
});

test('collapse binds original repeated setters to siblings while screen remains independent', () => {
  const world = new World([], [], 4),
    field = world.currentWrapper;
  world.fieldDisplays.moveCurrent(field, { x: 140, y: -70 });
  world.worldDisplays.follow(field);
  const screen = world.worldDisplays.read(undefined, 'screen');
  world.beginCollapse(0);
  for (let i = 0; i < 119; i++) world.step(emptyInput());
  // Original setter fixture219/119 pins this Number getter and binary32 coefficient.
  for (const kind of ['bullet', 'top', 'highlight'] as const) {
    const pose = world.worldDisplays.read(field, kind).pose;
    expect(pose.scaleX).toBe(0.4166666666666692);
    expect(pose.scaleY).toBe(0.4166666666666692);
    expect(pose.matrix.a).toBe(0.4166666567325592);
    expect(pose).toMatchObject({ x: -140, y: 70 });
  }
  expect(world.worldDisplays.read(undefined, 'screen')).toEqual(screen);
  const top = world.worldDisplays.layerMatrix(field, 'top', { x: 0, y: 0 });
  const bottom = world.worldDisplays.bottomMatrix(field, { x: 0, y: 0 });
  expect(top.a).toBe(0.4166666567325592);
  expect(bottom.a).toBe(0.1736111044883728);
  expect(world.worldDisplays.layerGlobal({ x: 100, y: 40 }, field, 'top', { x: 0, y: 0 })).toEqual({
    x: 176.65,
    y: 311.65,
  });
  const p = displayMatrixPoint(bottom, { x: 2000, y: 800 });
  expect({ x: p.x / 20, y: p.y / 20 }).toEqual({ x: 152.35, y: 301.95 });
  world.step(emptyInput());
  expect(world.worldDisplays.read(field, 'highlight').pose.alpha).toBe(0);
  expect(world.worldDisplays.read(field, 'top').pose.alpha).toBe(1);
  expect(world.worldDisplays.read(field, 'bullet').rooted).toBe(true);
});

test('arrival detaches bullet/top before cache reads and removes highlight after next registration', () => {
  const world = new World([], [], 5),
    old = world.currentWrapper;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  const oldIdentity = world.worldDisplays.read(old, 'bullet').identity;
  const seen: string[] = [];
  const store = world.cache.store.bind(world.cache);
  world.cache.store = (...args: Parameters<typeof store>) => {
    expect(world.worldDisplays.read(old, 'bullet').rooted).toBe(false);
    expect(world.worldDisplays.read(old, 'top').rooted).toBe(false);
    expect(world.fieldDisplays.read(old).root.rooted).toBe(false);
    expect(world.worldDisplays.read(old, 'highlight').rooted).toBe(true);
    seen.push('cache');
    return store(...args);
  };
  const register = world.effectEngine.register.bind(world.effectEngine);
  world.effectEngine.register = (layer) => {
    expect(world.worldDisplays.read(old, 'highlight').rooted).toBe(true);
    seen.push(layer.kind);
    return register(layer);
  };
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(seen).toEqual(['cache', 'top', 'bottom']);
  expect(world.worldDisplays.read(old, 'bullet').identity).toBe(oldIdentity);
  expect(world.worldDisplays.read(old, 'highlight').rooted).toBe(false);
  expect(world.worldDisplays.read(next, 'bullet').rooted).toBe(true);
  expect(world.worldDisplays.layerMatrix(old, 'bullet', { x: 90, y: -40 }).tx).toBe(
    world.worldDisplays.read(old, 'bullet').pose.matrix.tx,
  );
});

test('read projections are clock/entropy/membership-free; unregistering a name does not detach it', () => {
  const world = new World([], [], 6),
    field = world.currentWrapper;
  const before = world.worldDisplays.read(field, 'top');
  let draws = 0;
  world.rng.next = () => {
    draws++;
    return 0.5;
  };
  world.effectEngine.unregister('top');
  for (let i = 0; i < 10; i++) {
    expect(world.worldDisplays.read(field, 'top')).toEqual(before);
    expect(world.worldDisplays.layerMatrix(field, 'top', { x: 0.07, y: -0.07 })).toMatchObject({
      tx: 5501,
      ty: 4499,
    });
  }
  expect(draws).toBe(0);
  expect(world.stats.frames).toBe(0);
  expect(world.effectEngine.resolve('top')).toBeUndefined();
  world.effectEngine.detachLayer(world.effectEngine.layer(field, 'top')!);
  expect(world.worldDisplays.read(field, 'top').rooted).toBe(false);
});
