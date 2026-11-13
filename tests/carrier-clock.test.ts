import { setFieldFixtureLayout } from '../tools/fixtures/field-layout';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';
import { FieldRuntime } from '../src/game/simulation/field-runtime';
import {
  RegisteredEffects,
  EffectLayerReadError,
  type PendingEffect,
  type EffectRequest,
} from '../src/game/simulation/registered-effects';
import { cacheEmptyField } from './fixtures/empty-field';

const world = () => {
  const w = new World(
    [],
    [{ ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 3008 }] }],
    1,
  );
  w.player.life = 1;
  w.hitTest = () => false;
  return w;
};
const frames = (w: World, n: number) => {
  for (let i = 0; i < n; i++) w.step(emptyInput());
};
const carrier = (w: World, total = 26): PendingEffect =>
  w.effectEngine.constructCarrier({ owner: w.player, gun: w.player.guns[0], frame: 1, total });

test('constructed parentless carriers match all 70 original before-ENTER cohort poses and keep wrapping', () => {
  const w = world(),
    clips = [carrier(w, 25), carrier(w, 26)];
  w.pause();
  for (let tick = 1; tick <= 70; tick++) {
    frames(w, 1);
    expect(clips.map((c) => c.frame)).toEqual(clips.map((c) => ((tick - 1) % c.total) + 1));
    expect(clips.map((c) => w.effectEngine.parent(c))).toEqual([undefined, undefined]);
  }
});

test('construction inside Run holds frame1 at its EXIT and at the next ENTER/EXIT', () => {
  const w = world();
  let clip!: PendingEffect;
  const enter = w.effectEngine.poll.bind(w.effectEngine);
  w.effectEngine.poll = () => {
    clip ??= carrier(w);
    enter();
  };
  frames(w, 1);
  expect(clip.frame).toBe(1);
  frames(w, 1);
  expect(clip.frame).toBe(1);
  frames(w, 1);
  expect(clip.frame).toBe(2);
});

test('delayed field tail resolves current names, retains request writes and original carrier without reset', () => {
  const w = world(),
    old = w.field,
    clip = carrier(w, 25);
  const next = { ...old, col: 99, enemies: [] };
  w.effectEngine.createFieldLayers(next);
  const request: EffectRequest = { clip, x: 13, y: 23, name: 'bottom', randomRotation: false };
  w.runtimeFor(next).queueEffect(request);
  w.pause();
  frames(w, 32);
  expect(clip.frame).toBe(7);
  expect(w.effectEngine.parent(clip)).toBeUndefined();
  expect([...w.effectEngine.owned(w.effectEngine.layer(old, 'bottom')!)]).toEqual([]);
  w.effectEngine.unregister('bottom');
  w.effectEngine.register(w.effectEngine.layer(next, 'bottom')!);
  w.runtimeFor(next).flushEffects((r) => {
    r.clip.x = r.x;
    r.clip.y = r.y;
    w.effectEngine.create(r.clip, r.name, next, r.callback);
  });
  expect(clip).toMatchObject({ x: 13, y: 23, frame: 7 });
  expect(w.effectEngine.parent(clip)).toBe(w.effectEngine.layer(next, 'bottom'));
  expect(w.runtimeFor(next).pending).toEqual([clip]);
});

test('removed and discarded carriers keep their construction clocks while referenced', () => {
  const w = world(),
    clip = carrier(w, 25);
  let parentAtCallback: unknown;
  w.effectEngine.create(
    clip,
    'top',
    w.field,
    () => (parentAtCallback = w.effectEngine.parent(clip)),
  );
  w.pause();
  frames(w, 25);
  w.effectEngine.poll();
  expect(parentAtCallback).toBe(w.effectEngine.layer(w.field, 'top'));
  expect(w.effectEngine.parent(clip)).toBeUndefined();
  frames(w, 45);
  expect(clip.frame).toBe(20); // original ENTER70 after completion at25
  w.effectEngine.discard(clip);
  w.advanceArtwork(); // Main4 skips World.Run; stage still advances.
  expect(clip.frame).toBe(21);
});

test('next-field weapon callbacks queue on currentBFTarget after its tail and wait for the next Run', () => {
  const w = world(),
    old = w.field;
  cacheEmptyField(w);
  w.jump({ x: 1, y: 0 });
  const next = w.transit!.next;
  let queued!: PendingEffect;
  const complete = w['completeField'].bind(w);
  w['completeField'] = (field, visit) => {
    if (field === next && !queued) {
      queued = w.scheduleShot(w.player, w.player.guns[0], 26);
      expect(w.runtimeFor(next).pending).toEqual([]);
      expect(w.runtimeFor(old).pending).toEqual([queued]);
      expect(w.effectEngine.pendingFor(old)).toEqual([]);
      expect(w.effectEngine.parent(queued)).toBeUndefined();
    }
    return complete(field, visit);
  };
  frames(w, 1);
  expect(w.effectEngine.parent(queued)).toBeUndefined();
  frames(w, 1);
  expect(w.effectEngine.parent(queued)).toBe(w.effectEngine.layer(old, 'bottom'));
  expect(queued.frame).toBe(1);
  expect(w.runtimeFor(next).pending).toEqual([]);
  expect(w.runtimeFor(old).pending).toEqual([queued]);
});

test('avatar-phase carriers miss the preceding field tail and register on the next Run', () => {
  const w = world();
  let queued!: PendingEffect;
  const tick = w['tickProtection'].bind(w);
  w['tickProtection'] = (tank) => {
    queued ??= w.scheduleShot(w.player, w.player.guns[0], 26);
    tick(tank);
  };
  frames(w, 1);
  expect(w.effectEngine.parent(queued)).toBeUndefined();
  expect(queued.frame).toBe(1);
  frames(w, 1);
  expect(w.effectEngine.parent(queued)).toBe(w.effectEngine.layer(w.field, 'bottom'));
  expect(queued.frame).toBe(1);
});

test('a request explicitly owned by next flushes at next tail into the outgoing registered layer', () => {
  const w = world(),
    old = w.field;
  cacheEmptyField(w);
  w.jump({ x: 1, y: 0 });
  const next = w.transit!.next,
    clip = carrier(w);
  w.runtimeFor(next).queueEffect({ clip, x: 14, y: 24, name: 'bottom', randomRotation: false });
  expect(w.effectEngine.parent(clip)).toBeUndefined();
  frames(w, 1);
  expect(w.effectEngine.parent(clip)).toBe(w.effectEngine.layer(old, 'bottom'));
  expect(clip).toMatchObject({ frame: 1, x: 14, y: 24 });
  expect(w.runtimeFor(next).pending).toEqual([]);
});

test('callback-born queued carrier survives ready polling, waits for tail and reaches final frame in its own cohort', () => {
  const w = world(),
    gun = w.player.guns[0];
  const first = w.registerEffectCallback({ owner: w.player, gun, frame: 26, total: 26 });
  let born!: PendingEffect,
    calls = 0;
  w.spawnVolley = () => {
    calls++;
    if (!born) born = w.scheduleShot(w.player, gun, 26);
    return [];
  };
  frames(w, 1);
  expect(calls).toBe(1);
  expect(w.effectEngine.parent(first)).toBeUndefined();
  expect(w.effectEngine.parent(born)).toBeUndefined();
  w.effectEngine.poll();
  expect(calls).toBe(1);
  frames(w, 25);
  expect(born.frame).toBe(25);
  expect(calls).toBe(1);
  frames(w, 1);
  expect(calls).toBe(2);
  expect(w.runtimeFor(w.field).pending).toEqual([]);
});

test('engine clear and field queue clear have independent no-callback boundaries', () => {
  const w = world(),
    queued = w.scheduleShot(w.player, w.player.guns[0], 26);
  const attached = w.registerEffectCallback({
    owner: w.player,
    gun: w.player.guns[0],
    total: 26,
    frame: 1,
  });
  w.effectEngine.clear();
  expect(w.runtimeFor(w.field).pending).toEqual([queued]);
  expect(w.runtimeFor(w.field).queuedCarriers).toEqual([queued]);
  expect(w.effectEngine.pendingFor(w.field)).toEqual([]);
  expect(w.effectEngine.parent(attached)).toBeUndefined();
  w.runtimeFor(w.field).clearEffectQueue();
  expect(w.runtimeFor(w.field).pending).toEqual([]);
  w.pause();
  frames(w, 30);
  expect([queued.frame, attached.frame]).toEqual([4, 4]);
});

test('live field queue retains appended requests and preserves the whole queue on a failed tail', () => {
  const w = world(),
    runtime = new FieldRuntime(w.field, new RegisteredEffects());
  const first: EffectRequest = { clip: carrier(w), x: 0, y: 0, name: 'top', randomRotation: false };
  const born: EffectRequest = { ...first, clip: carrier(w) };
  runtime.queueEffect(first);
  const visited: EffectRequest[] = [];
  runtime.flushEffects((request) => {
    visited.push(request);
    if (request === first) runtime.queueEffect(born);
  });
  expect(visited).toEqual([first, born]);
  expect(runtime.pending).toEqual([]);
  runtime.queueEffect(first);
  runtime.queueEffect(born);
  expect(() =>
    runtime.flushEffects((r) => {
      if (r === born) throw new EffectLayerReadError('missing');
    }),
  ).toThrow(EffectLayerReadError);
  expect(runtime.pending).toEqual([first.clip, born.clip]);
});

test('constructing and queueing a callback carrier consumes neither gameplay RNG nor actor/projectile IDs', () => {
  const w = world(),
    control = world();
  w.scheduleShot(w.player, w.player.guns[0], 26);
  w.scheduleShield(w.player, w.player.guns[0]);
  expect(w.nextId()).toBe(control.nextId());
  expect(w.rng.next()).toBe(control.rng.next());
});

test('failed name resolution leaves queued identities intact while the independent stage clock continues', () => {
  const w = world(),
    clip = w.scheduleShot(w.player, w.player.guns[0], 26);
  const layer = w.effectEngine.layer(w.field, 'bottom')!;
  w.effectEngine.unregister('bottom');
  frames(w, 2); // scoped source read ends Main.Run before replacing the field queue
  expect(w.runtimeFor(w.field).pending).toEqual([clip]);
  expect(w.effectEngine.parent(clip)).toBeUndefined();
  expect(clip.frame).toBe(2);
  w.effectEngine.register(layer);
  frames(w, 1);
  expect(w.effectEngine.parent(clip)).toBe(layer);
  expect(clip.frame).toBe(3);
});

test('ordinary requests retain supplied coordinates, layer and rotation flag independently of later clip edits', () => {
  const w = world(),
    clip = w.addCombatEffect({ x: 13, y: 23 }, 'impact');
  clip.x = 99;
  clip.y = 100;
  clip.layer = 'bottom';
  clip.randomRotation = false;
  w.rng.next = () => 0.5;
  frames(w, 1);
  expect(clip).toMatchObject({ x: 13, y: 23, rotation: 180 });
  expect(w.effectEngine.parent(clip)).toBe(w.effectEngine.layer(w.field, 'top'));
});

test('arrival Deactivate clears only a completed outgoing queue, without stopping retained carriers', () => {
  for (const completed of [false, true]) {
    const w = world(),
      old = w.field,
      gun = w.player.guns[0];
    cacheEmptyField(w);
    w.jump({ x: 1, y: 0 });
    // Completion is a fresh wrapper latch, independent of the cached cleared flag.
    const complete = w['completeField'].bind(w);
    w['completeField'] = (field, visit) => {
      if (field === old) visit.completed = completed;
      else complete(field, visit);
    };
    w.registerEffectCallback({ owner: w.player, gun, frame: 26, total: 26 });
    let queued!: PendingEffect;
    w.spawnVolley = () => {
      queued = w.scheduleShot(w.player, gun, 26);
      return [];
    };
    w.player.x = w.transit!.target.x;
    w.player.y = w.transit!.target.y;
    setFieldFixtureLayout(w);
    frames(w, 1);
    expect(w.transit).toBeNull();
    expect(w.effectEngine.parent(queued)).toBeUndefined();
    expect(w.runtimeFor(old).queuedCarriers).toEqual(completed ? [] : [queued]);
    w.pause();
    frames(w, 3);
    expect(queued.frame).toBe(3);
  }
});
