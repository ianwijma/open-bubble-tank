import { expect, test } from 'bun:test';
import {
  ViewerHighlights,
  viewerCardWarning,
  VIEWER_HOVER_GLOW,
} from '../src/game/core/viewer-highlights';
import { STARTER, AVATARS } from '../src/game/data/catalog';

test('card hover advances on frames, retains source warning overshoot, and freezes under a modal', () => {
  const h = new ViewerHighlights();
  h.setup(0, 'one', true);
  h.step([true]);
  expect(h.rows[0]).toMatchObject({ lines: true, glow: true, caution: 12 / 256 });
  h.step([false], false);
  expect(h.rows[0]).toMatchObject({ lines: true, glow: true, caution: 12 / 256 });
  for (let i = 0; i < 30; i++) h.step([true]);
  expect(h.rows[0].caution).toBe(240 / 256);
  for (let i = 0; i < 10; i++) h.step([false]);
  expect(h.rows[0].caution).toBeLessThan(0);
  expect(h.rows[0].caution).toBeGreaterThan(-0.1);
  expect(h.rows[0]).toMatchObject({ lines: false, glow: false });
});
test('Setup replaces preview filters and warning alpha but retains the slot line latch until an exit/reentry', () => {
  const h = new ViewerHighlights();
  h.setup(0, 'one', true);
  h.step([true]);
  h.setup(0, 'two', false);
  h.step([true]);
  expect(h.rows[0]).toMatchObject({ instance: 'two', lines: true, glow: false, caution: 0 });
  h.step([false]);
  h.step([true]);
  expect(h.rows[0].glow).toBe(true);
  h.clear(0);
  expect(h.rows[0]).toMatchObject({ lines: false, glow: false });
});
test('warning eligibility uses the loaded class budget, ignores body unlocks and keeps enemy capacity checks separate from selection', () => {
  const limits = { level: 1, maxClass: 2, gunPoints: 0 };
  expect(viewerCardWarning(STARTER, limits)).toBe(false);
  expect(viewerCardWarning(AVATARS[1], limits)).toBe(true);
  const body = { ...STARTER, parts: [{ ...STARTER.parts[0], type: 1600 }] };
  expect(viewerCardWarning(body, limits)).toBe(false);
  const guns = {
    ...STARTER,
    parts: Array.from({ length: 3 }, (_, i) => ({ ...STARTER.parts[1], key: String(i) })),
  };
  expect(viewerCardWarning(guns, limits)).toBe(true);
  expect(viewerCardWarning({ ...guns, avatar: false }, limits)).toBe(false);
  expect(VIEWER_HOVER_GLOW).toMatchObject({
    color: [255, 255, 255, 25.5],
    blurX: 28,
    blurY: 28,
    strength: 3,
    passes: 3,
  });
});

test('warning reads authoritative profile unlocks, with body parts exempt', () => {
  const limits = { level: 6, maxClass: 6, gunPoints: 0, unlockedParts: [] as number[] };
  expect(viewerCardWarning(STARTER, limits)).toBe(true);
  expect(
    viewerCardWarning(STARTER, { ...limits, unlockedParts: STARTER.parts.map((p) => p.type) }),
  ).toBe(false);
  expect(viewerCardWarning({ ...STARTER, parts: [STARTER.parts[0]] }, limits)).toBe(false);
  // An unlocked low-tier weapon stays usable even when a legacy tier fallback would reject it.
  const gun = { ...STARTER, classId: 1, parts: [{ ...STARTER.parts[1], type: 2002 }] };
  expect(
    viewerCardWarning(gun, { level: 0, maxClass: 6, gunPoints: 0, unlockedParts: [2002] }),
  ).toBe(false);
});
test('warning capacity uses active level class cap separately from stored profile readout', () => {
  const tank = { ...STARTER, classId: 3, parts: [STARTER.parts[0]] };
  expect(viewerCardWarning(tank, { level: 1, maxClass: 6, gunPoints: 0 })).toBe(true);
  expect(viewerCardWarning(tank, { level: 6, maxClass: 1, gunPoints: 0 })).toBe(false);
});
test('caution retains signed display-alpha residue and freezes during suspended steps', () => {
  const h = new ViewerHighlights();
  h.setup(0, 'one', true);
  const values: number[] = [];
  for (let i = 0; i < 21; i++) {
    h.step([true]);
    values.push(h.rows[0].caution * 256);
  }
  expect(values).toEqual([
    12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 240,
  ]);
  h.step([false]);
  expect(h.rows[0].caution).toBe(214 / 256);
  for (let i = 0; i < 9; i++) h.step([false]);
  expect(h.rows[0].caution).toBe(-19 / 256);
  h.step([false]);
  expect(h.rows[0].caution).toBe(-19 / 256);
  h.step([true], false);
  expect(h.rows[0].caution).toBe(-19 / 256);
  h.step([true]);
  expect(h.rows[0].caution).toBe(-6 / 256);
});
