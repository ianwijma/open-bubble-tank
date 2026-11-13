import { expect, test } from 'bun:test';
import { projectEffects } from '../src/game/render/effect-projection';
import type { Effect } from '../src/game/core/types';
import { World, emptyInput } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';

const effect = (uid: number, layer: Effect['layer'] = 'bottom'): Effect => ({
  uid,
  kind: 'native',
  layer,
  symbol: 1723,
  x: 100,
  y: 40,
  age: 0,
  duration: 10000,
  frame: 1,
  radius: 10,
  color: 0xffffff,
});

test('paint follows the actual registered parent rather than the completion context wrapper', () => {
  const world = new World([], [], 1),
    current = world.currentWrapper;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next,
    clip = effect(400);
  world.effectEngine.create(clip, 'bottom', next);
  expect(world.runtimeFor(next).effects).toContain(clip);
  expect(world.runtimeFor(current).effects).not.toContain(clip);
  const paint = projectEffects(world).find((p) => p.clip === clip)!;
  expect(paint).toMatchObject({ x: 100, y: 40, scale: 1, layer: 'bottom', parentAlpha: 1 });
  expect(paint.x).not.toBe(world.transit!.offset.x + clip.x);
  expect(world.effectEngine.parent(clip)).toBe(world.effectEngine.layer(current, 'bottom')!);
});

test('reparenting uses the actual name/order and distinct same-UID objects keep separate identities', () => {
  const world = new World([], [], 2),
    field = world.currentWrapper;
  const a = effect(400),
    b = effect(400);
  world.effectEngine.create(a, 'bottom', field);
  world.effectEngine.create(b, 'top', field);
  world.effectEngine.create(a, 'top', field);
  const paint = projectEffects(world);
  expect(paint.map((p) => p.clip)).toEqual([b, a]);
  expect(paint.map((p) => p.layer)).toEqual(['top', 'top']);
  expect(world.runtimeFor(field).effects).toHaveLength(2);
  expect(a.layer).toBe('bottom'); // Data grouping is not physical parenting.
  world.effectEngine.create(b, 'top', field);
  expect(projectEffects(world).map((p) => p.clip)).toEqual([a, b]);
});

test('bottom paint composes the actual nested matrices and inherits field opacity independently of top/screen', () => {
  const world = new World([], [], 3),
    field = world.currentWrapper;
  world.fieldDisplays.moveCurrent(field, { x: 140, y: -70 });
  world.worldDisplays.follow(field);
  const bottom = effect(400),
    top = effect(401, 'top'),
    screen = effect(402, 'screen');
  screen.x = screen.y = 0;
  world.effectEngine.create(bottom, 'bottom', field);
  world.effectEngine.create(top, 'top', field);
  world.effectEngine.create(screen, 'screen', field);
  world.beginCollapse(0);
  for (let i = 0; i < 119; i++) world.step(emptyInput());
  const read = (clip: Effect) => projectEffects(world).find((p) => p.clip === clip)!;
  expect(read(bottom)).toMatchObject({ x: -122.65, y: 76.95, scale: 0.1736111044883728 });
  expect(read(top)).toMatchObject({ x: -98.35, y: 86.65, scale: 0.4166666567325592 });
  expect(read(screen)).toMatchObject({ x: 0, y: 0, layer: 'screen' });
  expect(read(screen).scale).toBeUndefined();
  world.step(emptyInput());
  expect(read(bottom).parentAlpha).toBe(0);
  expect(read(top).parentAlpha).toBe(1);
  expect(read(screen).clip).toBe(screen);
});

test('projection has no timeline/entropy/registration side effects and detached layers stop painting', () => {
  const world = new World([], [], 4),
    field = world.currentWrapper,
    clip = effect(400, 'top');
  world.effectEngine.create(clip, 'top', field);
  const before = { ...clip },
    root = world.fieldDisplays.read(field);
  let draws = 0;
  world.rng.next = () => {
    draws++;
    return 0.5;
  };
  for (let i = 0; i < 5; i++) projectEffects(world);
  expect(clip).toEqual(before);
  expect(world.fieldDisplays.read(field)).toEqual(root);
  expect(world.stats.frames).toBe(0);
  expect(draws).toBe(0);
  world.effectEngine.unregister('top');
  expect(projectEffects(world).find((p) => p.clip === clip)).toBeDefined();
  world.effectEngine.detachLayer(world.effectEngine.layer(field, 'top')!);
  expect(projectEffects(world).find((p) => p.clip === clip)).toBeUndefined();
});
