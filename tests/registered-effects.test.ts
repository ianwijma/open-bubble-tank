import { setFieldFixtureLayout } from '../tools/fixtures/field-layout';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import type { Effect, Field } from '../src/game/core/types';
import { World, emptyInput } from '../src/game/simulation/world';
import {
  RegisteredEffects,
  EffectChildRemovalError,
} from '../src/game/simulation/registered-effects';
import { cacheEmptyField } from './fixtures/empty-field';

const field = (): Field => ({
  col: 0,
  row: 0,
  scale: 1,
  enemies: [],
  cleared: false,
  boss: false,
  tutorial: 0,
});
const clip = (uid: number): Effect => ({
  uid,
  x: 0,
  y: 0,
  kind: 'native',
  age: 3,
  duration: 4,
  radius: 10,
  color: 0xffffff,
});
function engine() {
  const effects = new RegisteredEffects(),
    owner = field();
  effects.createFieldLayers(owner);
  effects.register(effects.layer(owner, 'top')!);
  effects.register(effects.layer(owner, 'bottom')!);
  effects.register(effects.screen);
  return { effects, owner };
}

test('next-field requests attach the original modified object to the outgoing registered bottom layer', () => {
  const world = new World([], [], 1),
    outgoing = world.field;
  world.player.life = 1;
  cacheEmptyField(world);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  const effect = world.addCombatEffect(
    { x: 12, y: -13 },
    'rocketTrail',
    { line: { x: -2, y: 4 } },
    false,
    next,
  );
  effect.scale = 0.5;
  expect(world.effectEngine.parent(effect)).toBeUndefined();
  expect([...world.effectEngine.owned(world.effectEngine.layer(next, 'bottom')!)]).toEqual([]);
  world.step(emptyInput());
  expect(world.effectEngine.parent(effect)).toBe(world.effectEngine.layer(outgoing, 'bottom'));
  expect([...world.effectEngine.owned(world.effectEngine.layer(outgoing, 'bottom')!)]).toEqual([
    effect,
  ]);
  expect(effect).toMatchObject({ x: 12, y: -13, scale: 0.5, line: { x: -2, y: 4 } });
  expect(world.runtimeFor(next).effectQueue).toEqual([]);
  expect(world.runtimeFor(next).effects).toEqual([]);
});

test('queued effect arguments retain Number precision until CreateEffect writes the clip position', () => {
  const world = new World([], [], 1),
    runtime = world.runtimeFor(world.field),
    supplied = { x: 13.049, y: -23.049 },
    effect = world.addCombatEffect(supplied, 'rocketTrail'),
    observed: { x: number; y: number }[] = [],
    flush = runtime.flushEffects.bind(runtime);
  world.player.life = 1;
  runtime.flushEffects = (register) =>
    flush((request) => {
      observed.push({ x: request.x, y: request.y });
      register(request);
    });
  expect([effect.x, effect.y]).toEqual([0, 0]);
  // The queued Number arguments are independent of later edits to the clip.
  effect.x = 99;
  effect.y = 100;
  expect(world.effectEngine.parent(effect)).toBeUndefined();
  world.step(emptyInput());
  expect(observed).toEqual([supplied]);
  expect(effect).toMatchObject({ x: 13, y: -23 });
  expect(world.effectEngine.parent(effect)).toBe(world.effectEngine.layer(world.field, 'bottom'));
});

test('immediate CreateEffect applies signed twip setters before attachment', () => {
  const world = new World([], [], 1);
  for (const [supplied, assigned] of [
    [
      { x: -13.049, y: 23.049 },
      { x: -13, y: 23 },
    ],
    [
      { x: -0.049, y: 0.049 },
      { x: 0, y: 0 },
    ],
  ]) {
    const effect = world.addCombatEffect(supplied, 'rocketTrail', {}, true);
    expect(effect).toMatchObject(assigned);
    expect(world.effectEngine.parent(effect)).toBe(world.effectEngine.layer(world.field, 'bottom'));
  }
});

test('registered names resolve the first layer while actual child identity survives unregistration', () => {
  const { effects, owner } = engine(),
    other = field(),
    first = effects.layer(owner, 'bottom')!;
  effects.createFieldLayers(other);
  const second = effects.layer(other, 'bottom')!,
    effect = clip(1);
  effects.register(second);
  effects.create(effect, 'bottom', owner);
  expect(effects.parent(effect)).toBe(first);
  effects.unregister('bottom');
  expect(effects.resolve('bottom')).toBe(second);
  expect(effects.parent(effect)).toBe(first);
  expect(() => effects.poll()).toThrow(EffectChildRemovalError);
  expect([...effects.owned(first)]).toEqual([effect]);
  expect([...effects.owned(second)]).toEqual([]);
});

test('completion callbacks see their attached carrier and later ready effects, then remove in registration order', () => {
  const { effects, owner } = engine(),
    early = clip(1),
    later = clip(2),
    observations: number[][] = [];
  const bottom = effects.layer(owner, 'bottom')!;
  effects.create(early, 'bottom', owner, () =>
    observations.push([...effects.owned(bottom)].map((e) => ('uid' in e ? e.uid : 0))),
  );
  effects.create(later, 'bottom', owner, () =>
    observations.push([...effects.owned(bottom)].map((e) => ('uid' in e ? e.uid : 0))),
  );
  effects.poll();
  expect(observations).toEqual([[1, 2], [2]]);
  expect([...effects.owned(bottom)]).toEqual([]);
});

test('a callback-created effect is retained and waits until the next completion snapshot', () => {
  const { effects, owner } = engine(),
    first = clip(1),
    newborn = clip(2),
    calls: string[] = [];
  effects.create(first, 'top', owner, () => {
    calls.push('first');
    effects.create(newborn, 'bottom', owner, () => calls.push('newborn'));
  });
  effects.poll();
  expect(calls).toEqual(['first']);
  expect(effects.parent(newborn)).toBe(effects.layer(owner, 'bottom'));
  effects.poll();
  expect(calls).toEqual(['first', 'newborn']);
});

test('clear removes every registered layer child without completing callbacks', () => {
  const { effects, owner } = engine();
  let calls = 0;
  for (const name of ['top', 'bottom', 'screen'] as const)
    effects.create(clip(calls), name, owner, () => calls++);
  effects.clear();
  expect(calls).toBe(0);
  expect(effects.effectsFor(owner)).toEqual([]);
  for (const layer of [
    effects.layer(owner, 'top')!,
    effects.layer(owner, 'bottom')!,
    effects.screen,
  ])
    expect([...effects.owned(layer)]).toEqual([]);
});

function chargedWorld() {
  const design = { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 3008 }] };
  const world = new World([], [design], 1);
  world.player.life = 1;
  world.hitTest = () => false;
  const gun = world.player.guns[0];
  // An already-registered final-frame control preserves callback registration
  // order independently of the field queue's newly recovered tail phase.
  const carrier = world.registerEffectCallback({ owner: world.player, gun, total: 26, frame: 26 });
  return { world, gun, carrier };
}

test('World preserves a new completion carrier born inside an earlier carrier callback', () => {
  const { world, gun, carrier } = chargedWorld();
  let calls = 0;
  world.spawnVolley = () => {
    expect(world.effectEngine.parent(carrier)).toBe(
      world.effectEngine.layer(world.field, 'bottom'),
    );
    calls++;
    world.scheduleShot(world.player, gun, 26);
    return [];
  };
  world.step(emptyInput());
  expect(calls).toBe(1);
  expect(world.runtimeFor(world.field).pending).toHaveLength(1);
  expect(world.runtimeFor(world.field).pending[0].frame).toBe(1);
  expect(world.effectEngine.parent(world.runtimeFor(world.field).pending[0])).toBeUndefined();
  expect(world.effectEngine.parent(carrier)).toBeUndefined();
});

test('World does not pre-remove later completed artwork before an earlier callback', () => {
  const { world } = chargedWorld();
  const later = world.addCombatEffect({ x: 0, y: 0 }, 'impact', {}, true);
  later.playback!.pose.advance(3); // Explicit artificial final-at-next-ENTER setup.
  let observed = false;
  world.spawnVolley = () => {
    observed = true;
    expect(world.effects).toContain(later);
    return [];
  };
  world.step(emptyInput());
  expect(observed).toBe(true);
  expect(world.effects).not.toContain(later);
});

test('arrival clears the old instances before promoting fresh registrations', () => {
  const world = new World([], [], 1),
    old = world.field;
  world.player.life = 1;
  cacheEmptyField(world);
  const effect = world.addCombatEffect({ x: 0, y: 0 }, 'explosion', {}, true);
  world.jump({ x: 1, y: 0 });
  const next = world.transit!.next;
  expect(world.effectEngine.resolve('bottom')).toBe(world.effectEngine.layer(old, 'bottom'));
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  setFieldFixtureLayout(world);
  world.step(emptyInput());
  expect(world.effectEngine.parent(effect)).toBeUndefined();
  expect(world.effectEngine.resolve('bottom')).toBe(world.effectEngine.layer(next, 'bottom'));
  expect(world.effectEngine.layerAttached(world.effectEngine.layer(old, 'bottom')!)).toBe(false);
});

test('queued damage-burst scale and actual clip edits survive independently of frozen registration arguments', () => {
  const world = new World([], [], 1);
  world.mode = 'paused';
  const effect = world.addCombatEffect({ x: 13.049, y: -23.049 }, 'damageBurst', {
    randomRotation: false,
  });
  effect.scale = 0.5; // Source EnemyFlakBullet.as20–23 writes the clip before enqueue.
  effect.rotation = 31;
  effect.x = 90;
  effect.y = 80;
  for (let i = 0; i < 7; i++) world.step(emptyInput());
  const request = world.runtimeFor(world.field).queuedEffectRequests[0];
  const pose = effect.playback!.pose;
  expect([request.x, request.y, effect.x, effect.y]).toEqual([13.049, -23.049, 90, 80]);
  expect(effect.frame).toBe(7);
  world.effectEngine.createRequest(request, world.field, () => {
    throw new Error('Unexpected rotation entropy');
  });
  expect(effect.playback!.pose).toBe(pose);
  expect(effect).toMatchObject({ x: 13, y: -23, scale: 0.5, rotation: 31, frame: 7 });
});
