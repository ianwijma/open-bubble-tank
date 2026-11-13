import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import fixture from './fixtures/text-engine-original.json';
import previous from './fixtures/text-contact-original.json';
import { compareTextEngine, observedValues } from '../tools/reference/text-engine-compare';

const key = (s: { case: string; phase: string; role: string; point: string; space: string }) =>
  [s.case, s.phase, s.role, s.point, s.space].join('/');
const report = compareTextEngine(fixture);
const row = (phase: string, point: string, role = 'target', caseName = 'original-1659') => {
  const s = fixture.samples.find(
    (s) => s.case === caseName && s.phase === phase && s.point === point && s.role === role,
  );
  if (!s) throw new Error('Missing original control');
  return observedValues(fixture, s);
};

test('distinct Engine controls preserve every earlier frozen Number and control key', () => {
  expect(fixture.samples).toHaveLength(2554);
  expect(fixture.fields).toHaveLength(66);
  expect(new Set(fixture.samples.map(key)).size).toBe(2554);
  expect(fixture.fields.slice(0, previous.fields.length)).toEqual(previous.fields);
  for (const s of previous.samples) {
    const current = fixture.samples.find((n) => key(n) === key(s))!;
    expect(current).toBeDefined();
    for (let i = 0; i < previous.fields.length; i++) {
      expect(fixture.binaryWords[current.wordIndices[i]!]).toEqual(
        previous.binaryWords[s.wordIndices[i]!]!,
      );
    }
  }
});

test('original tag/binary provenance and measured matrix schema are frozen', () => {
  expect(fixture.originalSha256).toBe(previous.originalSha256);
  expect(fixture.originalAbcPayloadHashes).toEqual(previous.originalAbcPayloadHashes);
  expect(fixture.originalTextInventory).toEqual(previous.originalTextInventory);
  expect(fixture.runtimeModules).toEqual(previous.runtimeModules);
  expect(fixture.probeSha256).not.toBe(previous.probeSha256);
  expect(fixture.emitterSha256).toBe(
    createHash('sha256')
      .update(readFileSync(new URL('../tools/reference/text-engine-probe.py', import.meta.url)))
      .digest('hex'),
  );
  expect(fixture.addedTags.map((t) => t.code)).toEqual([
    33,
    74,
    33,
    74,
    ...Array(10).fill(39),
    82,
    76,
  ]);
  expect(fixture.fields.slice(42)).toEqual(
    ['targetOwn', 'wrapperOwn', 'targetConcatenated', 'wrapperConcatenated'].flatMap((p) =>
      ['a', 'b', 'c', 'd', 'tx', 'ty'].map((k) => p + '.' + k),
    ),
  );
  for (const s of fixture.samples) {
    expect(s.wordIndices).toHaveLength(66);
    const v = observedValues(fixture, s);
    expect(v.hit).toBe(v.hitAgain);
    expect([
      v['main.x'],
      v['main.y'],
      v['main.scaleX'],
      v['main.scaleY'],
      v['main.rotation'],
    ]).toEqual([0, 0, 1, 1, 0]);
  }
});

test('declared bounds plus measured own ancestry match genuine Engine hits and matrix getters', () => {
  expect(report.advancedContacts).toBe(1890);
  expect(report.matrixChecks).toBe(5102);
  expect(report.skippedDetachedMatrixChecks).toBe(6);
  expect(report.matrixMismatches).toBe(0);
  expect(report.contactMismatches).toBe(0);
  // These are discriminating original controls, not synthetic tests that merely
  // repeat an implementation: wrong policies disagree with actual builtin hits.
  expect(report.rejectedAlternatives).toEqual({
    idealNumberBounds: 48,
    perAncestorAabb: 76,
    inverseBeforeLeaf: 134,
  });
});

test('Point truncation remains separate from transformed bounds rounding at fractional edges', () => {
  for (const role of ['target', 'wrapper']) {
    expect(row('engine-identity', 'edge-xmin--25', role).hit).toBe(1);
    expect(row('engine-identity', 'edge-xmin--100', role).hit).toBe(0);
    expect(row('engine-identity', 'edge-xmax-25', role).hit).toBe(1);
    expect(row('engine-identity', 'edge-xmax-100', role).hit).toBe(0);
  }
  expect(row('engine-half-ties', 'edge-xmin-0')['worldBounds.x']).toBe(-24.8);
  expect(row('engine-half-ties', 'edge-ymin-0')['worldBounds.y']).toBe(0.4);
  expect(row('engine-identity', 'edge-xmin--25')['point.x']).toBe(-16.575);
});

test('bounded composed shear/reflection and singular point/line controls retain class-specific dispatch', () => {
  for (const phase of ['engine-composed-shear', 'engine-reflection']) {
    const v = row(phase, 'edge-xmin-0');
    const dot =
      v['targetConcatenated.a']! * v['targetConcatenated.c']! +
      v['targetConcatenated.b']! * v['targetConcatenated.d']!;
    expect(Math.abs(dot)).toBeGreaterThan(0.01);
  }
  for (const phase of ['engine-zero-x', 'engine-zero-y', 'engine-zero-both']) {
    expect(row(phase, 'edge-xmin-0').hit).toBe(1);
    expect(row(phase, 'edge-xmin-0', 'wrapper').hit).toBe(0);
    expect(row(phase, 'edge-xmin-0', 'target', 'derived-normal').hit).toBe(0);
  }
  expect(row('runtime-mask-miss', 'empty-margin').maskId).toBe(4);
  expect(row('runtime-mask-miss', 'empty-margin').hit).toBe(1);
  expect(row('target-detached', 'empty-margin').hit).toBe(0);
});
