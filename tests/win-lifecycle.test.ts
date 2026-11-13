import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { FieldVisit } from '../src/game/core/field-visit';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { WinScreen } from '../src/game/services/win-screen';
import { WorldFlow } from '../src/game/simulation/world-flow';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { blurPauseBitmap, premultiplyBitmap } from '../src/game/core/bitmap-blur';

function bossWorld(stage = new StageRuntime()) {
  const world = new World([], [STARTER, STARTER], 8, stage.effects);
  world.fieldVisit = new FieldVisit();
  world.field.boss = true;
  world.field.cleared = false;
  return { world, stage };
}

test('win notification precedes force pickups, Edit, completion latch, map clear and bullet wipe', () => {
  const { world } = bossWorld();
  world.dropBubbles({ x: 180, y: 180 }, 5);
  const bullet = createProjectile(world.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'mine',
    symbol: 1977,
    x: 150,
    y: 150,
    angle: 0,
    speed: 0,
    damage: 1,
  });
  world.addBullet(bullet);
  let notified = 0;
  world.onWinScreenOpen = () => {
    notified++;
    expect(world.mode).toBe('won');
    expect(world['flow'].state).toBe('stopped');
    expect(world.backgroundRunning).toBe(false);
    expect(world.stats.completed).toBe(1);
    expect(world.runtimeFor(world.field).pickups.every((p) => !p.forced)).toBe(true);
    expect(world.editSlider.enabled).toBe(false);
    expect(world.fieldVisit.completed).toBe(false);
    expect(world.field.cleared).toBe(false);
    expect(bullet.wipe).toBeFalsy();
    expect(world.achievements.has('Boss Badge')).toBe(false);
  };
  world.step(emptyInput());
  expect(notified).toBe(1);
  expect(world.runtimeFor(world.field).pickups.every((p) => p.forced)).toBe(true);
  expect(world.editSlider.enabled).toBe(true);
  expect(world.fieldVisit.completed).toBe(true);
  expect(world.field.cleared).toBe(true);
  expect(bullet.wipe).toBe(true);
  expect(world.achievements.has('Boss Badge')).toBe(true);
  world.step(emptyInput());
  expect(notified).toBe(1);
});

test('new win waits for the next cohort, shares catch-up, and retains stopped Run tail and art', () => {
  const { world, stage } = bossWorld();
  stage.capture.capture = () => undefined;
  let screen: WinScreen | undefined;
  world.onWinScreenOpen = () => {
    screen = new WinScreen(
      stage,
      () => {},
      () => {},
    );
  };
  stage.subscribe({ mainStep: () => world.step(emptyInput(), 0, false) });
  world.hitSoundTimer = 10;
  stage.advance(20, 50);
  expect(screen!.motion.age).toBe(0);
  expect(world.hitSoundTimer).toBe(9);
  const age = world.player.age,
    frames = world.stats.frames,
    art = world.player.artAge;
  world.player.status.jam = 20;
  stage.advance(100, 50);
  expect(screen!.motion.age).toBe(5);
  expect(world.player.age).toBe(age);
  expect(world.stats.frames).toBe(frames);
  expect(world.player.status.jam).toBe(20);
  expect(world.player.artAge).toBe(art + 5);
  expect(world.hitSoundTimer).toBe(4); // Main3 still invokes stopped World.Run.
  screen!.dispose();
});

test('win saves before nineteen blurs, raises frame2 on Run40 and tears down directly', () => {
  const stage = new StageRuntime();
  const rgba = new Uint8ClampedArray(550 * 450 * 4);
  rgba.set([255, 80, 30, 128], (225 * 550 + 275) * 4);
  let captures = 0,
    callbacks = 0;
  stage.capture.capture = (options) => {
    expect(options).toEqual({ refresh: true });
    captures++;
    return { data: rgba } as ImageData;
  };
  const screen = new WinScreen(
    stage,
    () => {},
    () => {
      callbacks++;
      expect(screen.active).toBe(false);
      expect(screen.history!.retainedBytes).toBe(0);
    },
  );
  const initial = premultiplyBitmap(rgba);
  stage.advance(20, 50);
  expect(screen.history!.savedFrames).toBe(0);
  stage.advance(20, 50);
  expect(screen.history!.savedFrames).toBe(1);
  expect(screen.history!.pixels).toEqual(blurPauseBitmap(initial.slice(), 550, 450));
  // Reuse the bitmap primitive's reversal only to inspect the saved unfiltered slot.
  const history = screen.history!;
  expect(history.index).toBe(1);
  const saved = (history as unknown as { history: Uint8ClampedArray[] }).history[0];
  expect(saved).toEqual(initial);
  for (let i = 0; i < 37; i++) stage.advance(20, 50);
  expect([screen.motion.age, history.savedFrames, screen.foregroundRaised]).toEqual([
    39,
    19,
    false,
  ]);
  const blurred = history.pixels.slice();
  stage.advance(20, 50);
  expect([screen.motion.contentFrame, screen.motion.alpha, screen.foregroundRaised]).toEqual([
    2,
    0,
    true,
  ]);
  expect(history.pixels).toEqual(blurred);
  stage.advance(20, 50);
  expect([screen.motion.contentFrame, screen.motion.alpha]).toEqual([3, 22 / 256]);
  screen.complete('continue');
  const age = screen.motion.age;
  stage.advance(100, 50);
  screen.complete('menu');
  expect([callbacks, captures, screen.motion.age]).toEqual([1, 1, age]);
});

test('Continue restores the shared saved mode, backgrounds and retained progression/world flags', () => {
  const { world } = bossWorld();
  world.step(emptyInput());
  const player = world.player,
    progression = world.progression,
    field = world.field;
  const commands: boolean[] = [];
  world.onBackgroundChange = (running) => commands.push(running);
  // Another source callback may have overwritten intCurrentGameMode while the dialog lives.
  world['flow'].saved = 'stopped';
  world.continueAfterWin();
  expect(world.mode).toBe('stopped');
  expect(commands).toEqual([true]);
  expect(world.player).toBe(player);
  expect(world.progression).toBe(progression);
  expect(world.field).toBe(field);
  expect([world.bossDefeated, field.boss, field.cleared]).toEqual([true, true, true]);
  const flow = new WorldFlow();
  flow.openWin();
  flow.saved = 'collapse';
  flow.closeWin();
  expect(flow.state).toBe('collapse');
  expect(flow.closeWin()).toBe(false);
});
