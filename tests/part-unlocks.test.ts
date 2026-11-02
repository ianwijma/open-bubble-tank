import { expect, test } from 'bun:test';
import { RunPartUnlocks } from '../src/game/core/part-unlocks';
import { STARTER, partById } from '../src/game/data/catalog';
import { paletteState } from '../src/game/simulation/editor-palette';
import { validateBuild } from '../src/game/simulation/designer';
import { viewerSelectionError } from '../src/game/core/tank-viewer';

test('new-world baseline matches the source reset and tier updates append without relocking earlier parts', () => {
  const run = new RunPartUnlocks();
  expect(run.parts).toContain(2001);
  expect(run.parts).toContain(4001);
  expect(run.parts).toContain(6005);
  expect(run.parts).not.toContain(7001); // _-cq omits the constructor's hidden-part append.
  expect(run.parts).not.toContain(2002);
  run.unlockThrough(3);
  expect(run.parts).toContain(5001);
  expect(run.parts).not.toContain(5003);
  const snapshot = run.parts;
  run.unlockThrough(1);
  expect(run.parts).toBe(snapshot);
  expect(new Set(run.parts).size).toBe(run.parts.length);
  expect(new RunPartUnlocks().parts).not.toContain(5001);
});
test('creator palette, save validation and viewer loading share the retained list while current-level budgets stay in force', () => {
  const run = new RunPartUnlocks();
  run.unlockThrough(3);
  const radar = partById(5001)!,
    context = {
      avatar: true,
      level: 1,
      classId: 1,
      budget: 2,
      gp: 1,
      bp: 3,
      unlockedParts: run.parts,
    };
  expect(paletteState(radar, context)).toMatchObject({ locked: false, affordable: true });
  expect(paletteState(radar, { ...context, gp: 2 })).toMatchObject({
    locked: false,
    affordable: false,
    reason: 'gun-points',
  });
  const tank = {
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'radar', type: 5001, x: 0, y: 20 }],
  };
  expect(validateBuild(tank, 1, 2, run.parts)).toEqual([]);
  expect(
    viewerSelectionError(tank, true, {
      level: 1,
      maxClass: 2,
      gunPoints: 2,
      unlockedParts: run.parts,
    }),
  ).toBe('');
  const fresh = new RunPartUnlocks();
  expect(paletteState(radar, { ...context, unlockedParts: fresh.parts }).locked).toBe(true);
  expect(validateBuild(tank, 1, 2, fresh.parts)).toContain('Radar unlocks at tank level 3.');
  expect(
    viewerSelectionError(tank, true, {
      level: 1,
      maxClass: 2,
      gunPoints: 2,
      unlockedParts: fresh.parts,
    }),
  ).toBe('Do not have all the parts for this tank');
});

test('tier order appends source IDs once and earlier snapshots remain unchanged', () => {
  const run = new RunPartUnlocks(),
    baseline = run.parts;
  run.unlockThrough(1);
  expect(run.parts.slice(baseline.length)).toEqual([2002, 2003, 2006, 2007]);
  const first = run.parts;
  run.unlockThrough(1);
  expect(run.parts).toBe(first);
  run.unlockThrough(2);
  expect(run.parts.slice(first.length)).toEqual([2004, 2008, 2018, 2022, 3001, 3009, 3010]);
  expect(first).not.toContain(3001);
  expect(baseline).not.toContain(2002);
  run.unlockThrough(6);
  expect(run.parts).toContain(5006);
  expect(run.parts).not.toContain(7001);
  expect(new Set(run.parts).size).toBe(run.parts.length);
  const all = run.parts;
  run.unlockThrough(0);
  expect(run.parts).toBe(all);
});
