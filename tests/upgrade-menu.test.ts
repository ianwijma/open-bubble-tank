import { expect, test } from 'bun:test';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { UpgradeMenu } from '../src/game/services/upgrade-menu';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';

test('one captured bitmap and its clock survive child visits and reverse before completion', () => {
  const stage = new StageRuntime();
  let captures = 0,
    completed = 0;
  const pixels = new Uint8ClampedArray(550 * 450 * 4);
  pixels.set([255, 100, 20, 255], (225 * 550 + 275) * 4);
  stage.capture.capture = () => {
    captures++;
    return { data: pixels } as ImageData;
  };
  const menu = new UpgradeMenu(stage, () => completed++);
  expect(menu.captureCount).toBe(1);
  stage.advance(100, 50);
  expect(menu.motion.counter).toBe(5);
  menu.motion.showChild('creator');
  for (let i = 0; i < 6; i++) stage.advance(100, 50);
  expect(menu.motion.counter).toBe(35);
  expect(menu.motion.cardInputEnabled).toBe(false);
  menu.motion.showChild('viewer');
  stage.advance(80, 50);
  expect(menu.motion.counter).toBe(39);
  expect(menu.history?.savedFrames).toBe(19);
  const history = menu.history;
  menu.motion.returnToOffers();
  expect(menu.history).toBe(history);
  expect(menu.motion.bottomInputEnabled).toBe(true);
  expect(captures).toBe(1);
  const blurred = history!.pixels.slice();
  menu.motion.beginClosing();
  stage.advance(20, 50);
  expect(menu.motion.counter).toBe(38);
  expect(menu.history!.pixels).toEqual(blurred); // First reversal slot19 is transparent.
  expect(menu.motion.cardInputEnabled).toBe(false);
  expect(menu.motion.bottomInputEnabled).toBe(true);
  for (let i = 0; i < 7; i++) stage.advance(100, 50);
  stage.advance(80, 50);
  expect(menu.motion.counter).toBe(-1);
  expect(completed).toBe(0);
  expect(menu.motion.foregroundAlpha).toBeLessThan(0);
  stage.advance(20, 50);
  expect(completed).toBe(1);
  expect(history!.retainedBytes).toBe(0);
  stage.advance(100, 50);
  menu.complete();
  expect(completed).toBe(1);
  expect(captures).toBe(1);
});

test('direct creator/confirmation completion skips reversal and releases its subscription', () => {
  const stage = new StageRuntime();
  stage.capture.capture = () => undefined;
  let completed = 0;
  const menu = new UpgradeMenu(stage, () => completed++);
  stage.advance(100, 50);
  menu.motion.showChild('creator');
  const counter = menu.motion.counter;
  menu.complete();
  stage.advance(100, 50);
  expect(completed).toBe(1);
  expect(menu.motion.counter).toBe(counter);
  expect(menu.motion.closing).toBe(false);
});

test('source card placement is synchronous and keeps the attached menu until Destroy', () => {
  const world = new World([], [], 1);
  world.secondaryHelpSeen = true;
  let opened = 0;
  world.onUpgradeMenuOpen = () => {
    expect(world.mode).toBe('upgrade');
    expect(world.progression.level).toBe(1);
    opened++;
  };
  world.player.life = 50;
  world.step(emptyInput());
  const before = world.player;
  const offer = world.offers[0];
  expect(opened).toBe(1);
  expect(world.placeUpgrade(offer)).toBe(true);
  expect(world.player).not.toBe(before);
  expect(world.player.design).toBe(offer);
  expect(world.progression.history[1]).toBe(offer);
  expect(world.mode).toBe('upgrade');
  expect(world.offers).toContain(offer);
  world.finishUpgrade();
  expect(world.mode).toBe('playing');
  expect(world.offers).toEqual([]);
  expect(world.placeUpgrade(STARTER)).toBe(false);
});

test('PlaceAvatar secondary help can overwrite the shared return mode during card reversal', () => {
  const world = new World([], [], 1);
  world.player.life = 50;
  world.step(emptyInput());
  const secondary = { ...STARTER, parts: [...STARTER.parts, { ...STARTER.parts[1], type: 3010 }] };
  expect(world.placeUpgrade(secondary)).toBe(true);
  expect(world.mode).toBe('upgrade');
  expect(world.secondaryHelpSeen).toBe(true);
  world.finishUpgrade();
  expect(world.mode).toBe('secondary-help');
  world.closeSecondaryHelp();
  expect(world.mode).toBe('playing');
});
