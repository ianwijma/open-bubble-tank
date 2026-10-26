import { expect, test } from 'bun:test';
import { MINIMAP, mapCenter, mapDotFrame, mapPoint } from '../src/game/core/minimap';
import { World, emptyInput } from '../src/game/simulation/world';

test('the map button cycles compact, large, hidden without pausing or changing the camera', () => {
  const world = new World([], [], 50);
  expect(world.mapMode).toBe(1);
  for (const mode of [2, 3, 1] as const) {
    world.cycleMap();
    expect(world.mapMode).toBe(mode);
    expect(world.mode).toBe('playing');
    world.step(emptyInput());
  }
  expect(world.stats.frames).toBe(3);
});
test('authored map layouts retain their sizes, registration points and cell spacing', () => {
  expect(MINIMAP.modes.map((m) => m.size)).toEqual([
    { width: 122.45, height: 94 },
    { width: 401.45, height: 274 },
    null,
  ]);
  const origin = { col: 0, row: 0 };
  expect(mapPoint(origin, origin, 1)).toEqual({ x: 72.7, y: 59.05 });
  expect(mapPoint(origin, origin, 2)).toEqual({ x: 212.7, y: 149.55 });
  const neighbor = mapPoint({ col: 1, row: -1 }, origin, 2);
  expect(neighbor.x).toBeCloseTo(237.7, 8);
  expect(neighbor.y).toBeCloseTo(124.55, 8);
  expect(mapPoint({ col: 1, row: 0 }, origin, 1).x - mapPoint(origin, origin, 1).x).toBeCloseTo(
    14.945220947265625,
  );
});
test('dot frames distinguish uncleared, cleared and destroyed fields and preserve the home marker', () => {
  const field = { col: 1, row: 0, cleared: false, destroyed: false };
  expect(mapDotFrame(field)).toBe(1);
  expect(mapDotFrame({ ...field, cleared: true })).toBe(3);
  expect(mapDotFrame({ ...field, cleared: true, destroyed: true })).toBe(2);
  expect(mapDotFrame({ ...field, col: 0, cleared: true })).toBe(1);
});
test('the map recenters on the attached destination at the start of a crossing', () => {
  const world = new World([], [], 50);
  const origin = world.field;
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  expect(world.field).toBe(origin);
  expect(mapCenter(world)).toBe(world.transit!.next);
  expect(mapCenter(world).col).toBe(1);
});
