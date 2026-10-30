import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import {
  defaultProfile,
  importDesign,
  loadProfile,
  saveProfile,
  saveCreatedTank,
  validateDesign,
  validateSettings,
} from '../src/game/services/profile';
import { canPlacePart, classFromPixelCount, validateBuild } from '../src/game/simulation/designer';
test('secondary help migrates unseen and persists only a real Boolean', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored: string | null = null;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    },
  });
  try {
    expect(loadProfile().secondaryHelpSeen).toBe(false);
    expect(loadProfile().tankViewerHelpSeen).toBe(false);
    stored = JSON.stringify({ version: 1, secondaryHelpSeen: 'true' });
    expect(loadProfile().secondaryHelpSeen).toBe(false);
    expect(saveProfile({ ...defaultProfile(), secondaryHelpSeen: true })).toBe(true);
    expect(loadProfile().secondaryHelpSeen).toBe(true);
    stored = JSON.stringify({ version: 1, tankViewerHelpSeen: 'true' });
    expect(loadProfile().tankViewerHelpSeen).toBe(false);
    expect(saveProfile({ ...defaultProfile(), tankViewerHelpSeen: true })).toBe(true);
    expect(loadProfile().tankViewerHelpSeen).toBe(true);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('saved designs reject corrupt coordinates, unknown parts and oversized arrays', () => {
  expect(validateDesign(STARTER)).toBe(true);
  expect(validateDesign({ ...STARTER, parts: [{ ...STARTER.parts[0], x: NaN }] })).toBe(false);
  expect(validateDesign({ ...STARTER, parts: [{ ...STARTER.parts[0], type: 9999 }] })).toBe(false);
  expect(validateDesign({ ...STARTER, parts: Array(401).fill(STARTER.parts[0]) })).toBe(false);
  expect(() => importDesign('{"name":"bad"}')).toThrow();
});
test('settings migrate safely without accepting arbitrary frame rates or hotkeys', () => {
  expect(validateSettings({ fps: 10000, h1: 'eval()', sound: false })).toMatchObject({
    fps: 50,
    h1: 'KeyW',
    sound: false,
  });
  expect(validateSettings({ fps: 65, h1: 'ArrowUp' })).toMatchObject({ fps: 65, h1: 'ArrowUp' });
  expect(validateSettings({ zoom: 0.65 }).zoom).toBe(0.65);
  expect(validateSettings({ zoom: 20 }).zoom).toBe(1.5);
  expect(validateSettings({ zoom: NaN }).zoom).toBe(1);
});
test('class is a pixel area measurement with inclusive original thresholds', () => {
  expect(classFromPixelCount(3465)).toBe(1);
  expect(classFromPixelCount(3466)).toBe(2);
  expect(classFromPixelCount(29701)).toBe(6);
});
test('creator enforces budgets, required bodies and unlock tiers', () => {
  expect(validateBuild(STARTER, 1, 2)).toEqual([]);
  const invalid = { ...STARTER, parts: [{ ...STARTER.parts[1], type: 3017 }] };
  const errors = validateBuild(invalid, 1, 2);
  expect(errors).toContain('You must have at least 1 bubble to save a tank');
  expect(errors.some((e) => e.includes('Gun Points'))).toBe(true);
  expect(errors.some((e) => e.includes('unlocks'))).toBe(true);
});
test('creator uses authored rings, weapon centers, and the large-class selection rectangle', () => {
  const body = { ...STARTER.parts[0], x: 35, y: 0, radius: 20, scale: 1 };
  expect(canPlacePart(body, 2, 2)).toBe(true);
  expect(canPlacePart({ ...body, x: 35.1 }, 2, 2)).toBe(false);
  const weapon = { ...body, type: 2001, x: 55 };
  expect(canPlacePart(weapon, 2, 2)).toBe(true);
  expect(canPlacePart({ ...weapon, x: 55.1 }, 2, 2)).toBe(false);
  expect(canPlacePart({ ...body, x: 174, y: 174 }, 5, 6)).toBe(true);
  expect(canPlacePart({ ...body, x: 176 }, 5, 6)).toBe(false);
  expect(
    validateBuild({ ...STARTER, parts: [{ ...body, x: 36 }, STARTER.parts[1]] }, 1, 2),
  ).toContain('Place every part inside the class 2 ring.');
});

test('creator saves fresh IDs, preserves previous designs, and awards after three retained custom tanks', () => {
  const original = { ...STARTER, id: 'imported-one', name: 'Imported avatar' };
  const enemy = { ...STARTER, id: 'imported-two', name: 'Imported enemy', avatar: false };
  let profile = { ...defaultProfile(), tanks: [original, enemy] };
  const saved = saveCreatedTank(profile, { ...original, name: 'Edited copy' });
  expect(saved.tank.id).toBe('L10000001');
  expect(saved.tank.sourceCode).toBeUndefined();
  expect(saved.profile.tanks.map((tank) => tank.id)).toEqual([
    'imported-one',
    'imported-two',
    'L10000001',
  ]);
  expect(saved.profile.tanks[0]).toBe(original);
  expect(saved.profile.achievements).toEqual(['Tank Creator']);
  profile = saved.profile;
  const again = saveCreatedTank(profile, saved.tank);
  expect(again.tank.id).toBe('L10000002');
  expect(again.profile.tanks).toHaveLength(4);
  expect(again.profile.achievements).toEqual(['Tank Creator']);
});

test('creator medal counts retained custom designs and excludes builtin library duplicates', () => {
  const profile = { ...defaultProfile(), tanks: [STARTER, { ...STARTER, id: 'imported-one' }] };
  const saved = saveCreatedTank(profile, STARTER);
  expect(saved.profile.achievements).toEqual([]);
  const third = saveCreatedTank(saved.profile, STARTER);
  expect(third.profile.achievements).toEqual(['Tank Creator']);
});

test('optional original-code identity metadata rejects nonstrings and oversized or malformed input', () => {
  expect(validateDesign({ ...STARTER, sourceCode: 1 })).toBe(false);
  expect(validateDesign({ ...STARTER, sourceCode: 'wrong' })).toBe(false);
  expect(validateDesign({ ...STARTER, sourceCode: 'a'.repeat(200006) })).toBe(false);
  expect(validateDesign(STARTER)).toBe(true);
});
