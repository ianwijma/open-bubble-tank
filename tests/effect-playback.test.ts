import { expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import original from './fixtures/effect-clock-original.json';
import { decode, rows } from '../tools/reference/effect-clock-evidence.mjs';
import { effectClockChildAtPath } from '../tools/reference/effect-clock-correspondence';
import { RegisteredEffects } from '../src/game/simulation/registered-effects';
import { combatEffect, type CombatEffect } from '../src/game/simulation/effects';
import { readEffectPlayback, drawEffectLine } from '../src/game/simulation/effect-playback';
import type { Effect, Field } from '../src/game/core/types';
import type { SwfClip } from '../src/game/assets/swf-clip';
import { World, emptyInput } from '../src/game/simulation/world';
import { RetainedTransform } from '../src/game/core/retained-transform';

const measured = rows(original.contract);
const field = (): Field => ({
  col: 0,
  row: 0,
  scale: 1,
  enemies: [],
  cleared: false,
  boss: false,
  tutorial: 0,
});
const totals = {
  frameComparisons: 0,
  poseComparisons: 0,
  identityComparisons: 0,
  currentMatrixComparisons: 0,
};
for (const root of original.sourceAudit.roots)
  for (const cohort of ['before', 'inside'])
    test(`retained production ${cohort}:${root.key} matches frozen root/descendant frames, correspondence and own poses`, () => {
      const engine = new RegisteredEffects(),
        owner = field();
      engine.createFieldLayers(owner);
      engine.register(engine.layer(owner, 'top')!);
      const samples = measured.filter((r) => r.label === `${cohort}:${root.key}`);
      let effect: Effect;
      const construct = () =>
        (effect = combatEffect(1, root.key as CombatEffect, {}, engine.artwork));
      if (cohort === 'before') construct();
      const retained = new Map<number, SwfClip>(),
        aliases = new Map<SwfClip, number>();
      let callbackTick = 0,
        stageTick = 0;
      const differences: unknown[] = [];
      const sample = (phase: string, tick: number) => {
        const pose = effect.playback!.pose;
        const group = samples.filter((r) => r.phase === phase && r.tick === tick);
        for (const row of group.filter((r) => r.kind === 'tree')) {
          if (phase === 'exit' && row.path !== '0') {
            const placement = effectClockChildAtPath(pose, row.path)?.placement;
            expect(placement).toBeDefined();
            const m = placement!.matrix;
            const actual = [
              m.tx / 20,
              m.ty / 20,
              placement!.color?.mult[3] ?? 1,
              m.a,
              m.b,
              m.c,
              m.d,
              m.tx / 20,
              m.ty / 20,
            ];
            const expected = decode(row.words).filter((_, i) => i < 2 || i >= 5);
            expect(actual).toEqual(expected);
            totals.currentMatrixComparisons++;
          }
          // Native Shape wrappers can change their symbol without changing AS identity.
          // SwfClip leaf placeholders model geometry, not that unqualified wrapper reuse.
          if (row.total === 0) continue;
          // Original transient AS wrapper holes are neither synthesized nor read here.
          // All own-pose/descendant correspondence claims are EXIT only.
          if (phase !== 'exit' && row.path !== '0') continue;
          const current = effectClockChildAtPath(pose, row.path);
          if (!current) {
            differences.push({ tick, phase, path: row.path, missing: row.id });
            continue;
          }
          if (retained.has(row.id) && retained.get(row.id) !== current)
            differences.push({ tick, phase, path: row.path, replaced: row.id });
          if (aliases.has(current) && aliases.get(current) !== row.id)
            differences.push({ tick, phase, alias: row.id, previous: aliases.get(current) });
          retained.set(row.id, current);
          aliases.set(current, row.id);
          totals.identityComparisons++;
        }
        for (const row of group) {
          if (row.path === '0') {
            expect(effect.frame).toBe(row.frame);
            expect(engine.parent(effect) === engine.layer(owner, 'top')).toBe(row.parentTop);
            expect([effect.x, effect.y]).toEqual(decode(row.words).slice(0, 2));
          }
          if (phase !== 'exit' || row.kind !== 'retained' || row.total === 0) continue;
          const candidate = retained.get(row.id);
          if (!candidate) {
            differences.push({ tick, missingRetained: row.id });
            continue;
          }
          if (row.total > 1) {
            totals.frameComparisons++;
            expect(candidate.frame).toBe(row.frame);
          }
          // Numeric authored own placement, including historical detached children.
          // Root setter caches are checked separately above; no invented isPlaying flag.
          const placement = candidate.placement;
          if (placement) {
            const own = new RetainedTransform(
              placement.matrix,
              placement.color?.mult[3] ?? 1,
            ).read();
            const values = [
              own.x,
              own.y,
              own.scaleX,
              own.scaleY,
              own.alpha,
              own.matrix.a,
              own.matrix.b,
              own.matrix.c,
              own.matrix.d,
              own.matrix.tx / 20,
              own.matrix.ty / 20,
            ];
            const expected = decode(row.words).filter((_, index) => index !== 4);
            totals.poseComparisons++;
            if (values.some((value, index) => !Object.is(value, expected[index])))
              differences.push({ tick, id: row.id, symbol: candidate.id, values, expected });
            const parent = row.parentNull ? null : retained.get(row.parentId);
            if (candidate.parent !== parent)
              differences.push({
                tick,
                id: row.id,
                parent: row.parentId,
                candidateParent: candidate.parent?.id ?? null,
              });
          }
        }
      };
      for (let tick = 1; tick <= 243; tick++) {
        stageTick = tick;
        engine.enterFrame();
        if (cohort === 'inside' && tick === 1) construct();
        sample('enter', tick);
        if (tick === 7) {
          sample('pre-register', tick);
          const index = original.sourceAudit.roots.indexOf(root) + (cohort === 'inside' ? 15 : 0);
          engine.createRequest(
            {
              clip: effect!,
              x: 13 + index,
              y: 23 + index,
              name: 'top',
              randomRotation: false,
              callback: () => {
                callbackTick = stageTick;
                sample('callback', stageTick);
              },
            },
            owner,
            () => {
              throw new Error('Unexpected RNG');
            },
          );
          sample('post-register', tick);
        }
        if (tick >= 7) engine.poll();
        engine.advanceArtwork();
        sample('exit', tick);
      }
      expect(callbackTick).toBe(samples.find((r) => r.phase === 'callback')!.tick);
      expect(readEffectPlayback(effect!).status).toBe('retained');
      expect(effect!.playback!.className).toBe(root.className);
      expect(effect!.playback!.symbol).toBe(root.symbol);
      expect(effect!.playback!.totalFrames).toBe(root.frames);
      expect(effect!.playback!.sourceSha256).toBe(original.originalSha256);
      if (differences.length && process.env.BT3_EFFECT_DIAGNOSTICS)
        writeFileSync(
          `test-results/retained-effects/${cohort}-${root.key}.json`,
          JSON.stringify(differences, null, 2),
        );
      expect(differences).toEqual([]);
    });

test('all frozen EXIT multi-frame retained comparisons remain covered', () => {
  expect(totals.frameComparisons).toBe(660);
  expect(totals.poseComparisons).toBe(349);
  expect(totals.identityComparisons).toBeGreaterThan(600);
  expect(totals.currentMatrixComparisons).toBe(
    measured.filter((r) => r.phase === 'exit' && r.kind === 'tree' && r.path !== '0').length,
  );
});

test('native retained lifetimes advance while paused, detached or Main4 skips World.Run, without gameplay entropy or UID allocation', () => {
  const world = new World([], [], 8);
  const effect = world.addCombatEffect({ x: 17, y: 29 }, 'impact');
  expect([effect.x, effect.y, effect.frame]).toEqual([0, 0, 1]);
  world.effectEngine.artwork.construct(effect);
  world.rng.next = () => {
    throw new Error('Artwork consumed gameplay entropy');
  };
  world.mode = 'paused';
  for (let i = 0; i < 7; i++) world.step(emptyInput());
  expect(effect.frame).toBe(3);
  world.runtimeFor(world.field).clearEffectQueue();
  const pose = effect.playback!.pose;
  for (let i = 0; i < 8; i++) world.advanceArtwork();
  expect(effect.frame).toBe(3);
  expect(effect.playback!.pose).toBe(pose);
  expect(world.nextId()).toBe(effect.uid + 1);
  expect(world.effectEngine.parent(effect)).toBeUndefined();
});

test('line graphics belong to the constructor named child and replacement/reads never recreate a source drawing call', () => {
  const engine = new RegisteredEffects();
  const effect = combatEffect(1, 'rocketTrail', { line: { x: -90, y: 3 } }, engine.artwork);
  const playback = effect.playback!,
    first = playback.lineTarget!;
  const lines = first.lines;
  expect(lines).toEqual([{ x: -90, y: 3, width: 2, color: 0xffffff, alpha: 0.3 }]);
  for (let i = 0; i < 51; i++) {
    engine.enterFrame();
    engine.advanceArtwork();
  }
  expect(playback.pose.children.get(1)!.clip).toBe(first);
  effect.line = { x: -500, y: 20 }; // Request telemetry cannot mutate numeric drawing ownership.
  expect(readEffectPlayback(effect)).toBe(playback);
  expect(first.lines).toBe(lines);
  // Explicit timeline retirement/replacement control; the original named property stays retained.
  playback.pose.children.delete(1);
  playback.pose.gotoAndPlay(2);
  const replacement = playback.pose.children.get(1)!.clip;
  expect(replacement).not.toBe(first);
  expect(replacement.lines).toEqual([]);
  drawEffectLine(effect, { x: 10, y: 5 });
  expect(first.lines).toHaveLength(2);
  expect(replacement.lines).toEqual([]);
});

test('unknown native and legacy mock effects expose their incomplete playback path explicitly', () => {
  const legacy = { kind: 'pop' } as Effect;
  const unknown = { kind: 'native', symbol: 999999 } as Effect;
  expect(readEffectPlayback(legacy).status).toBe('legacy-mock');
  expect(readEffectPlayback(unknown).status).toBe('unsupported-native');
  expect(() => new RegisteredEffects().artwork.construct(unknown)).toThrow(
    'Unsupported native effect',
  );
});

test('completion uses authoritative native frame/count while compatibility ages and durations can no longer fake readiness', () => {
  const engine = new RegisteredEffects(),
    owner = field();
  engine.createFieldLayers(owner);
  engine.register(engine.layer(owner, 'top')!);
  const effect = combatEffect(1, 'impact', {}, engine.artwork);
  let called = 0;
  engine.create(effect, 'top', owner, () => {
    called++;
    expect(effect.frame).toBe(4);
    expect(engine.parent(effect)).toBe(engine.layer(owner, 'top'));
  });
  effect.age = 999;
  effect.duration = 1;
  engine.poll();
  expect(called).toBe(0);
  for (let i = 0; i < 4; i++) {
    engine.enterFrame();
    engine.poll();
    engine.advanceArtwork();
  }
  expect(called).toBe(1);
  expect(engine.parent(effect)).toBeUndefined();
});
