import { expect, test } from 'bun:test';
import original from './fixtures/effect-clock-original.json';
import { decode, rows, unpack } from '../tools/reference/effect-clock-evidence.mjs';
import { RegisteredEffects } from '../src/game/simulation/registered-effects';
import type { Effect, Field } from '../src/game/core/types';

const measured = rows(original.contract);
const roots = measured.filter((r) => r.path === '0' && r.kind === 'tree');
for (const source of original.sourceAudit.roots)
  test(`original ${source.key}: independent construction, registration, completion and removed clocks`, () => {
    for (const cohort of ['before', 'inside']) {
      const group = roots.filter((r) => r.label === `${cohort}:${source.key}`);
      const at = (phase: string, tick: number) =>
        group.find((r) => r.phase === phase && r.tick === tick)!;
      expect(
        group.every((r) => r.className === source.className && r.total === source.frames),
      ).toBe(true);
      expect(new Set(group.map((r) => r.id)).size).toBe(1);
      expect([1, 2, 3].map((t) => at('enter', t).frame)).toEqual(
        cohort === 'before' ? [1, 2, 3] : [1, 1, 2],
      );
      expect([1, 2, 3].map((t) => at('exit', t).frame)).toEqual(
        cohort === 'before' ? [1, 2, 3] : [1, 1, 2],
      );
      expect(at('pre-register', 7).parentNull).toBe(true);
      expect(at('post-register', 7).parentTop).toBe(true);
      expect(at('post-register', 7).frame).toBe(at('pre-register', 7).frame);
      const done = group.find((r) => r.phase === 'callback')!;
      expect([done.frame, done.parentTop, done.parentNull]).toEqual([source.frames, true, false]);
      expect(at('exit', done.tick).parentNull).toBe(true);
      expect(at('exit', 243).parentNull).toBe(true);
      expect(at('exit', 243).frame).not.toBe(done.frame);
      expect(group.every((r) => r.isPlaying === 'undefined')).toBe(true);
    }
  });

test('stopped collapse child retains identity and frame103 across parent wrap while its own child advances', () => {
  const group = measured.filter(
    (r) => r.label === 'before:collapse' && r.kind === 'retained' && r.phase === 'exit',
  );
  const stopped = group.find((r) => r.total === 103)!.id;
  const nested = group.find((r) => r.total === 14)!.id;
  const at = (id: number, tick: number) => group.find((r) => r.id === id && r.tick === tick)!;
  expect([103, 104, 120, 121, 243].map((t) => at(stopped, t).frame)).toEqual([
    103, 103, 103, 103, 103,
  ]);
  expect([103, 104, 120, 121, 243].map((t) => at(nested, t).frame)).toEqual([5, 6, 8, 9, 5]);
  expect(decode(at(stopped, 103).words).slice(0, 4)).toEqual([
    199.5, 0, 0.49993896484375, 0.4998626708984375,
  ]);
  expect(decode(at(stopped, 121).words).slice(0, 4)).toEqual([399.25, 0, 1, 1]);
});

test('original transient child lookup holes and unavailable playing getters stay explicit', () => {
  const lines = unpack(original.contract);
  expect(lines.filter((s) => s.startsWith('BT3_EFFECT_NULL ')).length).toBe(399);
  expect(lines).toContain('BT3_EFFECT_NULL 3 enter before:explosion 0/1 tree');
  const lookup = measured.filter(
    (r) => r.label === 'before:explosion' && r.tick === 3 && r.path === '0/1',
  );
  expect(lookup.map((r) => r.phase)).toEqual(['exit']);
  expect(lookup[0].className).toBe('flash.display::Shape');
  expect(measured.filter((r) => r.total > 0).every((r) => r.isPlaying === 'undefined')).toBe(true);
});

test('root-only scripts audit does not erase the qualified descendant stop action', () => {
  expect(original.sourceAudit.roots).toHaveLength(15);
  expect(original.sourceAudit.roots.every((r) => r.constructorOnlySuper)).toBe(true);
  const descendants = original.sourceAudit.roots.flatMap((r) => r.descendants);
  expect(descendants.filter((r) => r.frameScript).map((r) => r.symbol)).toEqual([2069]);
  expect(descendants.some((r) => r.random)).toBe(false);
});

test('current registration-owned generic age remains a documented candidate discrepancy', () => {
  const engine = new RegisteredEffects();
  const owner = {
    col: 0,
    row: 0,
    scale: 1,
    enemies: [],
    cleared: false,
    boss: false,
    tutorial: 0,
  } as Field;
  engine.createFieldLayers(owner);
  engine.register(engine.layer(owner, 'top')!);
  const clip = {
    uid: 1,
    x: 0,
    y: 0,
    kind: 'native',
    age: 0,
    duration: 4,
    radius: 1,
    color: 0xffffff,
  } as Effect;
  for (let tick = 1; tick < 7; tick++) engine.advanceArtwork();
  const observed = roots.find((r) => r.label === 'before:impact' && r.phase === 'pre-register')!;
  expect([clip.age + 1, observed.frame]).toEqual([1, 3]);
  engine.create(clip, 'top', owner);
  for (let i = 0; i < 4; i++) {
    engine.advanceArtwork();
    engine.poll();
  }
  const removedAge = clip.age;
  for (let i = 0; i < 20; i++) engine.advanceArtwork();
  expect(clip.age).toBe(removedAge);
  expect(
    roots.find((r) => r.label === 'before:impact' && r.phase === 'exit' && r.tick === 243)!.frame,
  ).toBe(3);
});
