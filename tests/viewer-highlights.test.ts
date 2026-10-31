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
  expect(h.rows[0]).toMatchObject({ lines: true, glow: true, caution: 0.05 });
  h.step([false], false);
  expect(h.rows[0]).toMatchObject({ lines: true, glow: true, caution: 0.05 });
  for (let i = 0; i < 30; i++) h.step([true]);
  expect(h.rows[0].caution).toBeCloseTo(0.9, 12);
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
