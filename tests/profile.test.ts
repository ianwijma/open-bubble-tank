import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import {
  defaultProfile,
  importDesign,
  loadProfile,
  saveProfile,
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
    stored = JSON.stringify({ version: 1, secondaryHelpSeen: 'true' });
    expect(loadProfile().secondaryHelpSeen).toBe(false);
    expect(saveProfile({ ...defaultProfile(), secondaryHelpSeen: true })).toBe(true);
    expect(loadProfile().secondaryHelpSeen).toBe(true);
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
  expect(errors.some((e) => e.includes('body'))).toBe(true);
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
