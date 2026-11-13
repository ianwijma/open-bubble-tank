import { expect, test } from 'bun:test';
import original from './fixtures/world-motion-original.json';
import {
  directions,
  measured,
  pointComparison,
  publicSequence,
} from '../tools/reference/world-motion-compare';

for (const phase of directions)
  test(`public World ${phase} movement and receiver bridge match actual original camera calls`, () => {
    for (const snapshot of publicSequence(phase)) {
      const root = measured(snapshot.phase, snapshot.age, 'root');
      for (const role of ['root', 'avatarUnder', 'avatar', 'top', 'bullet', 'highlight'] as const)
        for (const axis of ['x', 'y'] as const)
          expect(snapshot[role][axis], `${snapshot.phase}/${snapshot.age}/${role}.${axis}`).toBe(
            measured(snapshot.phase, snapshot.age, role)[axis],
          );
      for (const axis of ['x', 'y'] as const) {
        expect(snapshot.bridge[axis]).toBe(root[`local.${axis}`]);
        expect(snapshot.point[axis]).toBe(root[`local.${axis}`]);
        expect(snapshot.rootGlobal[axis]).toBe(root[`point100x40.${axis}`]);
        if (snapshot.phase !== 'teleport')
          expect(snapshot.velocity[axis]).toBe(root[`delta.${axis}`]);
      }
    }
  });

test('attached Point arithmetic matches all400 original camera receiver rows, including masks and fractional Main', () => {
  for (const row of original.samples) {
    const result = pointComparison(row);
    expect(result.candidate, `${row.phase}/${row.age}/${row.role}`).toEqual(result.actual);
  }
});

test('measured camera outcome distinguishes the physical bridge from independent scalar accumulation', () => {
  const root = measured('both', 40, 'root');
  expect(root['local.x']).toBe(170.55);
  expect(root['local.y']).toBe(170.55);
  expect(root['local.x']).not.toBe(171.15);
  expect(measured('both', 40, 'avatarUnder').x).toBe(root['local.x']);
  expect(measured('both', 40, 'avatar').x).toBe(0);
  expect(measured('both-fraction', 40, 'root')['stage.x']).toBe(275.05);
  expect(measured('both-fraction', 40, 'root')['stage.y']).toBe(224.95);
  expect(measured('both-fraction', 40, 'root')['local.x']).toBe(root['local.x']);
});

test('actual next copies and mask results retain the declared constructor-only setup boundary', () => {
  for (const row of original.samples.filter((s) => s.role === 'root')) {
    const next = measured(row.phase, row.age, 'nextRoot');
    for (const role of ['nextTop', 'nextBullet'])
      for (const axis of ['x', 'y'])
        expect(measured(row.phase, row.age, role)[axis]).toBe(next[axis]);
    expect(measured(row.phase, row.age, 'nextMask').rotation).toBe(180);
  }
  // Source _-Xa retains _-WU=false without writing the current mask at nonpositive X.
  // Original fresh constructors start0; World.attach explicitly starts180 instead.
  // This test records that setup distinction; it does not reinterpret it as a method failure.
  for (const phase of ['down', 'negative'] as const) {
    expect(measured(phase, 40, 'currentMask').rotation).toBe(0);
    expect(publicSequence(phase).find((s) => s.phase === phase && s.age === 40)!.mask).toBe(180);
  }
});
