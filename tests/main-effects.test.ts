import { expect, test } from 'bun:test';
import { MainEffects } from '../src/game/simulation/main-effects';
import { StageRuntime } from '../src/game/services/stage-runtime';
import { Random } from '../src/game/core/math';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { STARTER } from '../src/game/data/catalog';

const ticks = (effects: MainEffects, count: number, random = () => 1) => {
  for (let i = 0; i < count; i++) effects.tick(random);
};

test('Main shake retains each third-frame sample and the bytecode-confirmed double addition', () => {
  const effects = new MainEffects(),
    rng = new Random(12345);
  effects.shake(12);
  ticks(effects, 2, () => rng.next());
  expect(effects.position).toEqual({ x: 0, y: 0 });
  const expected = [
    { x: 1.75, y: -1.75 },
    { x: -0.5, y: 2 },
    { x: -0.5, y: -1.75 },
  ];
  for (const position of expected) {
    effects.tick(() => rng.next());
    expect(effects.position).toEqual(position);
    ticks(effects, 2, () => rng.next());
    expect(effects.position).toEqual(position);
  }
  effects.tick(() => rng.next());
  expect(effects.remaining).toBe(0);
  expect(effects.position).toEqual({ x: 0, y: 0 });
});

test('amplitude uses the initial >45 threshold and short shakes never sample random', () => {
  for (const duration of [1, 2, 3, 45, 46, 60]) {
    const effects = new MainEffects();
    let draws = 0;
    effects.shake(duration);
    ticks(effects, 3, () => {
      draws++;
      return 1;
    });
    if (duration <= 3) {
      expect(draws).toBe(0);
      expect(effects.remaining).toBe(0);
    } else {
      const target = ((duration > 45 ? 4 : 2) * (duration - 3)) / duration;
      expect(draws).toBe(2);
      expect(effects.position.x).toBeCloseTo(Math.trunc(target * 20) / 20 + Math.round(target));
      expect(effects.remaining).toBe(duration - 3);
    }
  }
});

test('active shakes reject replacements; disable retains an active duration at the baseline', () => {
  const effects = new MainEffects();
  effects.shake(12);
  effects.shake(60);
  expect(effects.remaining).toBe(12);
  effects.setEnabled(false); // Source _-Zj does nothing when Main is already at baseline.
  expect(effects.remaining).toBe(12);
  ticks(effects, 3);
  expect(effects.position).toEqual({ x: 3.5, y: 3.5 });
  effects.shake(60);
  expect(effects.remaining).toBe(9);
  effects.setEnabled(false);
  expect(effects.position).toEqual({ x: 0, y: 0 });
  expect(effects.remaining).toBe(0);
  effects.shake(12);
  expect(effects.remaining).toBe(0);
  effects.setEnabled(true);
  effects.shake(12);
  expect(effects.remaining).toBe(12);
});

test('Main reset adds the rounded baseline itself, including the source nonzero-baseline bug', () => {
  const effects = new MainEffects();
  effects.position = { x: 10.25, y: -20.25 };
  effects.shake(12);
  ticks(effects, 12);
  expect(effects.position).toEqual({ x: 20.25, y: -40.25 });
});

test('Main setters retain twip coordinates and fixed8 alpha rather than ideal floating-point values', () => {
  const effects = new MainEffects();
  effects.shake(7);
  ticks(effects, 3, () => 0.8);
  // Raw candidate4/7, delta4/7; assign0.55, add round(delta)=1.
  expect(effects.position).toEqual({ x: 1.55, y: 1.55 });
  const flash = effects.flash();
  ticks(effects, 1);
  expect(flash.alpha).toBe(243 / 256);
  ticks(effects, 18);
  expect(flash.alpha).toBe(9 / 256);
  ticks(effects, 1);
  expect(flash.alpha).toBe(-3 / 256);
  expect(effects.flashes).toContain(flash);
  ticks(effects, 1);
  expect(effects.flashes).toEqual([]);
});

test('flash fill alpha is separate from its twenty-stage-frame fade; overlaps retain their births', () => {
  const effects = new MainEffects(),
    first = effects.flash(0xff0000, 0.2);
  ticks(effects, 4);
  expect(first.alpha).toBe(204 / 256);
  const second = effects.flash(0x0000ff, 0.5);
  expect(second.alpha).toBe(1);
  ticks(effects, 16);
  expect(effects.flashes).toEqual([first, second]);
  expect(first.fillAlpha).toBe(0.2);
  expect(first.alpha).toBeLessThanOrEqual(0);
  expect(second.alpha).toBe(48 / 256);
  ticks(effects, 1);
  expect(effects.flashes).toEqual([second]);
  ticks(effects, 4);
  expect(effects.flashes).toEqual([]);
});

test('shared stage advances effects before transform/input/gameplay, once, and survives world unmount', () => {
  const stage = new StageRuntime(),
    world = new World([], [], 1, stage.effects);
  world.pause();
  stage.random = () => 1;
  stage.effects.shake(12);
  const seen: [number, number][] = [];
  const phases: string[] = [];
  stage.subscribe({ beforeStep: () => phases.push('transform') });
  const unsubscribe = stage.subscribe({
    elapsed: (ms) => {
      phases.push('elapsed');
      world.advanceTime(ms);
    },
    step: () => {
      phases.push('game');
      world.step(emptyInput(), 0, false);
      seen.push([stage.effects.remaining, stage.effects.position.x]);
      if (seen.length === 1) stage.effects.flash();
    },
  });
  stage.advance(60, 50);
  expect(phases).toEqual([
    'elapsed',
    'transform',
    'game',
    'transform',
    'game',
    'transform',
    'game',
  ]);
  expect(seen).toEqual([
    [11, 0],
    [10, 0],
    [9, 3.5],
  ]);
  expect(stage.effects.flashes[0].alpha).toBe(230 / 256);
  expect(world.stats.frames).toBe(0);
  unsubscribe();
  for (let i = 0; i < 10; i++) stage.advance(40, 50);
  expect(stage.effects.flashes).toEqual([]);
  expect(stage.effects.remaining).toBe(0);
  expect(seen).toHaveLength(3);
});

test('stage uses selected FPS, limits catch-up and retains real elapsed time for Timer callbacks', () => {
  const stage = new StageRuntime();
  let steps = 0,
    elapsed = 0;
  stage.subscribe({ step: () => steps++, elapsed: (ms) => (elapsed += ms) });
  stage.advance(1000, 50);
  expect(steps).toBe(5);
  expect(elapsed).toBe(1000);
  stage.advance(100, 90);
  expect(steps).toBe(14);
});

test('Main effects age through every world state; damage and avatar replacement do not invent effects', () => {
  const world = new World([], [], 1);
  world.player.life = 50;
  world.damage(world.player, 1);
  world.editPlayer(STARTER);
  expect(world.mainEffects.remaining).toBe(0);
  expect(world.mainEffects.flashes).toEqual([]);
  for (const mode of ['paused', 'upgrade', 'secondary-help', 'won'] as const) {
    world.mode = mode;
    const flash = world.mainEffects.flash();
    world.step(emptyInput());
    expect(flash.alpha).toBe(243 / 256);
  }
});

test('Massive completion requests gated shake then flash before spawning, with full birth alpha', () => {
  for (const enabled of [false, true]) {
    const world = new World([], [], 1);
    world.screenShake = enabled;
    world.player = createTank(
      world.nextId(),
      {
        ...STARTER,
        parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 3008 }],
      },
      'player',
    );
    world
      .runtimeFor(world.field)
      .pending.push({ owner: world.player, gun: world.player.guns[0], total: 26, frame: 26 });
    const spawn = world.spawnVolley.bind(world);
    let called = false;
    world.spawnVolley = (...args) => {
      called = true;
      expect(world.mainEffects.remaining).toBe(enabled ? 20 : 0);
      expect(world.mainEffects.flashes).toEqual([{ color: 0xffffff, fillAlpha: 1, alpha: 1 }]);
      return spawn(...args);
    };
    world.step(emptyInput());
    expect(called).toBe(true);
    expect(world.mainEffects.flashes[0].alpha).toBe(1);
    world.pause();
    world.step(emptyInput());
    expect(world.mainEffects.flashes[0].alpha).toBe(243 / 256);
  }
});

test('Apocalypse rejects pause and retains independent Main flashes through its completion crossing', () => {
  const world = new World([], [], 1);
  world.beginCollapse(0);
  world.step(emptyInput());
  expect(world.mainEffects.remaining).toBe(1);
  expect(world.mainEffects.flashes[0].alpha).toBe(1);
  world.pause();
  expect(world.mode).toBe('collapse');
  world.step(emptyInput());
  expect(world.collapse!.age).toBe(2);
  expect(world.mainEffects.remaining).toBe(0);
  expect(world.mainEffects.flashes[0].alpha).toBe(243 / 256);
  world.resume();
  for (let i = 0; i < 117; i++) world.step(emptyInput());
  const retained = world.mainEffects.flash();
  world.step(emptyInput());
  expect(world.mode).toBe('transit');
  expect(world.collapse).toBeNull();
  expect(world.mainEffects.flashes).toContain(retained);
  world.step(emptyInput());
  expect(retained.alpha).toBe(230 / 256);
});
