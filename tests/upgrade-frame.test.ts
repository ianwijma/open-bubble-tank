import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { UpgradeMenu } from '../src/game/services/upgrade-menu';
import { STARTER } from '../src/game/data/catalog';

test('the birth frame finishes World.Run once, and the new menu begins on the next cohort', () => {
  const stage = new StageRuntime();
  stage.capture.capture = () => undefined;
  const world = new World([], [], 1, stage.effects);
  world.secondaryHelpSeen = true;
  let menu: UpgradeMenu | undefined;
  let captureAge = -1;
  world.onUpgradeMenuOpen = () => {
    captureAge = world.player.age;
    menu = new UpgradeMenu(stage, () => {
      world.finishUpgrade();
      menu = undefined;
    });
  };
  stage.subscribe({
    mainStep: () => {
      if (menu) world.advanceArtwork();
      else world.step(emptyInput(), 0, false);
    },
  });
  world.player.life = 50;
  stage.advance(20, 50);
  expect(captureAge).toBe(0); // Interface callback precedes the selected Run's avatar tail.
  expect(world.player.age).toBe(1);
  expect(world.player.artAge).toBe(1);
  expect(menu!.motion.counter).toBe(0);
  world.hitSoundTimer = 7;
  stage.advance(20, 50);
  expect(menu!.motion.counter).toBe(1);
  expect(world.player.age).toBe(1);
  expect(world.player.artAge).toBe(2);
  expect(world.hitSoundTimer).toBe(7); // Main4 omits the World listener's timer tail.
  expect(world.placeUpgrade(world.offers[0])).toBe(true);
  menu!.motion.beginClosing();
  const frames = world.stats.frames;
  stage.advance(20, 50); // Counter0; first reverse draw.
  stage.advance(20, 50); // Counter-1; final alpha write.
  stage.advance(20, 50); // Destroy, after this frame's Main/world turn.
  expect(menu).toBeUndefined();
  expect(world.stats.frames).toBe(frames);
  expect(world.mode).toBe('playing');
  stage.advance(20, 50);
  expect(world.stats.frames).toBe(frames + 1);
  expect(world.hitSoundTimer).toBe(6);
});

test('attached artwork can advance without interface, field, actor or hit-timer work', () => {
  const world = new World([], [], 2);
  world.player.life = 50;
  world.player.status.jam = 20;
  world.hitSoundTimer = 10;
  const gun = world.player.guns[0],
    counter = gun.counter;
  for (let i = 0; i < 10; i++) world.advanceArtwork();
  expect(world.progression.level).toBe(0);
  expect(world.stats.frames).toBe(0);
  expect(world.player.age).toBe(0);
  expect(world.player.artAge).toBe(10);
  expect(world.player.status.jam).toBe(20);
  expect(gun.counter).toBe(counter);
  expect(world.hitSoundTimer).toBe(10);
});

test('upgrade destruction resumes backgrounds even when secondary help keeps world mode stopped', () => {
  const stage = new StageRuntime(),
    world = new World([], [], 1);
  const events: boolean[] = [];
  world.onBackgroundChange = (running) => {
    events.push(running);
    if (running) stage.background.resume();
    else stage.background.stop();
  };
  world.player.life = 50;
  world.step(emptyInput());
  expect(events).toEqual([false]);
  expect(stage.background.running).toBe(false);
  world.placeUpgrade({
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], type: 3010 }],
  });
  expect(events).toEqual([false]);
  world.finishUpgrade();
  expect(world.mode).toBe('secondary-help');
  expect(world.backgroundRunning).toBe(true);
  expect(stage.background.running).toBe(true);
  for (let i = 0; i < 5; i++) world.step(emptyInput());
  expect(events).toEqual([false, true]);
  world.closeSecondaryHelp();
  world.pause();
  expect(events).toEqual([false, true, false]);
  stage.background.efficient = false; // Source efficiency Off forcibly resumes a stopped layer.
  world.step(emptyInput());
  expect(stage.background.running).toBe(true);
  expect(world.backgroundRunning).toBe(false); // Last World event does not overrule Settings.
  world.resume();
  expect(events).toEqual([false, true, false, true]);
});

test('background recipients run after Main but before a later menu resumes them', () => {
  const stage = new StageRuntime(),
    observed: number[] = [];
  let finished = false;
  stage.background.stop();
  stage.subscribe({ mainStep: () => observed.push(stage.background.revision) });
  stage.subscribe({
    step: () => {
      observed.push(stage.background.revision);
      if (finished) return;
      finished = true;
      stage.background.resume();
    },
  });
  stage.advance(20, 50);
  expect(observed).toEqual([0, 0]);
  expect(stage.background.revision).toBe(0);
  stage.advance(20, 50);
  expect(observed).toEqual([0, 0, 0, 1]);
  expect(stage.background.revision).toBe(1);
});
