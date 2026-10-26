import { FieldVisit } from '../src/game/core/field-visit';
import { expect, test } from 'bun:test';
import { EditSliderState } from '../src/game/core/edit-slider';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';

test('native edit variants use compact, large and hidden map geometry', () => {
  const state = new EditSliderState();
  expect(state.x).toBe(-504.05);
  state.trigger(0, 1);
  expect(state.enabled).toBe(false);
  for (const [mode, frame, y, width, firstX] of [
    [1, 2, 124, 122, -92],
    [2, 3, 304, 401.45, -346.45],
    [3, 1, 54, 24, 6],
  ]) {
    state.trigger(1, mode as 1 | 2 | 3);
    expect([state.layout.frame, state.y, state.layout.bounds.width]).toEqual([frame, y, width]);
    state.advance();
    expect(state.x).toBeCloseTo(firstX, 8);
  }
});
test('edit motion scales its speed by remaining distance and keeps the source final movement', () => {
  const state = new EditSliderState();
  state.trigger(1, 1);
  state.advance();
  const first = state.x;
  state.advance();
  expect(state.x - first).toBeCloseTo((40 * (24 - first)) / 156, 8);
  for (let i = 0; i < 80; i++) state.advance();
  expect(state.tween).toBe(-1);
  expect(state.x).toBeGreaterThan(24);
  expect(state.x).toBeLessThan(24.27);
  state.hide();
  expect(state.enabled).toBe(false);
  for (let i = 0; i < 80; i++) state.advance();
  expect(state.tween).toBe(-1);
  expect(state.x).toBeLessThan(-132);
  expect(state.x).toBeGreaterThan(-132.27);
});
test('map cycling repositions a settled slider and preserves the previous trigger speed', () => {
  const state = new EditSliderState();
  state.trigger(1, 1);
  state.reflow(2);
  expect(state.mapMode).toBe(1);
  for (let i = 0; i < 80; i++) state.advance();
  state.reflow(2);
  expect([state.x, state.y, state.layout.frame]).toEqual([24, 304, 3]);
  state.hide();
  state.advance();
  expect(state.x).toBe(-16); // _-BV changes the variant, not the previous 40px trigger speed.
});
test('clearing and reentering fields trigger the slider, crossings keep its clock, pause freezes it', () => {
  const world = new World([], [STARTER, STARTER], 50);
  expect(world.editSlider.enabled).toBe(false);
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  world.step(emptyInput());
  expect(world.canEdit).toBe(true);
  world.jump({ x: 1, y: 0 });
  const x = world.editSlider.x;
  world.step(emptyInput());
  expect(world.editSlider.x).not.toBe(x);
  expect(world.canEdit).toBe(false);
  world.pause();
  const paused = world.editSlider.x;
  world.step(emptyInput());
  expect(world.editSlider.x).toBe(paused);
  world.resume();
  for (let i = 0; i < 150 && world.mode === 'transit'; i++) world.step(emptyInput());
  world.jump({ x: -1, y: 0 });
  expect(world.editSlider.tween).toBe(1);
  for (let i = 0; i < 150 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(world.canEdit).toBe(true);
  expect(world.editSlider.atRest).toBe(true);
});
test('editing replaces the current progression tank and restarts health at its upgrade point', () => {
  const world = new World([], [STARTER, STARTER], 50);
  world.player.life = 83;
  const replacement = { ...STARTER, id: 'replacement', name: 'Edited Tank' };
  world.editPlayer(replacement);
  expect(world.player.design).toBe(replacement);
  expect(world.player.life).toBe(2);
  expect(world.progression.level).toBe(1);
  expect(world.progression.history[1]).toBe(replacement);
});
