import { expect, test } from 'bun:test';
import { STARTER, AVATARS } from '../src/game/data/catalog';
import { tankLoadEligibility } from '../src/game/core/tank-eligibility';
import { viewerSelectionError } from '../src/game/core/tank-viewer';
import { viewerCardWarning } from '../src/game/core/viewer-highlights';
const profile = { level: 2, maxClass: 3, gunPoints: 3 };

test('loading uses the candidate class budget rather than the preceding editor draft budget', () => {
  const tripod = AVATARS.find((t) => t.name === 'Tripod')!;
  expect(tankLoadEligibility(tripod, profile)).toMatchObject({
    budget: 4,
    overGunPoints: false,
    missingParts: false,
  });
  expect(viewerSelectionError(tripod, true, profile)).toBe('');
  expect(viewerCardWarning(tripod, profile)).toBe(false);
  expect(viewerSelectionError(tripod, true, { ...profile, gunPoints: 0 })).toBe('');
  expect(viewerSelectionError(tripod, true, { ...profile, level: 1, gunPoints: 100 })).toBe(
    'Do not have the parts and exceeds Gun Points',
  );
});
test('selection reports source capacity labels independently of missing parts and ignores body-point totals', () => {
  const bodies = Array.from({ length: 101 }, (_, i) => ({
    ...STARTER.parts[0],
    type: 1001,
    key: String(i),
  }));
  expect(viewerSelectionError({ ...STARTER, parts: bodies }, true, profile)).toBe('');
  const classOnly = { ...STARTER, classId: 4, parts: [STARTER.parts[0]] };
  expect(viewerSelectionError(classOnly, true, profile)).toBe('Exceeds your Class');
  const superNimble = AVATARS.find((t) => t.name === 'Super Nimble')!;
  expect(viewerSelectionError(superNimble, true, profile)).toBe('Exceeds your Gun Points');
  expect(viewerSelectionError({ ...superNimble, classId: 4 }, true, profile)).toBe(
    'Exceeds your Gun Points, Class',
  );
});
test('authoritative profile unlock lists override the level fallback and never lock decorative bodies', () => {
  const radar = {
    ...STARTER,
    parts: [
      { ...STARTER.parts[0], type: 1600 },
      { ...STARTER.parts[1], type: 5001 },
    ],
  };
  expect(viewerSelectionError(radar, true, profile)).toBe(
    'Do not have all the parts for this tank',
  );
  expect(viewerSelectionError(radar, true, { ...profile, unlockedParts: [5001] })).toBe('');
  expect(viewerSelectionError(STARTER, true, { ...profile, level: 6, unlockedParts: [] })).toBe(
    'Do not have all the parts for this tank',
  );
  expect(
    viewerSelectionError({ ...radar, parts: [radar.parts[0]] }, true, {
      ...profile,
      unlockedParts: [],
    }),
  ).toBe('');
});
test('enemy selection bypasses avatar restrictions while its caution still uses the floored 1.5 capacity multiplier', () => {
  const enemy = {
    ...STARTER,
    avatar: false,
    parts: Array.from({ length: 20 }, (_, i) => ({ ...STARTER.parts[1], key: String(i) })),
  };
  expect(tankLoadEligibility(enemy, { ...profile, level: 0, maxClass: 1 })).toMatchObject({
    budget: 19,
    overGunPoints: true,
    overClass: false,
    missingParts: false,
  });
  expect(viewerSelectionError(enemy, false, profile)).toBe('');
  expect(viewerCardWarning(enemy, profile)).toBe(true);
  expect(viewerCardWarning({ ...enemy, parts: enemy.parts.slice(0, 19) }, profile)).toBe(false);
});
