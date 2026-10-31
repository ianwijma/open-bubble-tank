import { expect, test } from 'bun:test';
import { CREATOR_GUIDE, advanceCreatorGuide } from '../src/game/core/creator-guide';
import { defaultProfile, loadProfile } from '../src/game/services/profile';

test('creator tutorial keeps six authored pages, offscreen initial Back, and original parent offset', () => {
  expect(CREATOR_GUIDE.symbol).toBe(968);
  expect(CREATOR_GUIDE.frames.map((f) => f.frame)).toEqual([2, 3, 4, 5, 6, 7]);
  expect(CREATOR_GUIDE.parent).toMatchObject({ tx: -213, ty: -280 });
  const first = CREATOR_GUIDE.frames[0];
  expect(first.buttons.find((b) => b.name === 'back_tut')!.matrix.ty).toBeLessThan(0);
  expect(first.text.replace(/\s+/g, ' ')).toContain('Tank Editor/Creator');
  expect(CREATOR_GUIDE.frames[5].text).toContain('symmetric mode');
});

test('Next and Back follow source frame stepping and final Next selects off', () => {
  expect(advanceCreatorGuide(2)).toBe(3);
  expect(advanceCreatorGuide(3, true)).toBe(2);
  expect(advanceCreatorGuide(7)).toBe(1);
  expect(advanceCreatorGuide(1)).toBe(1);
});

test('new and legacy profiles default creator entry latch off and retain only a real boolean', () => {
  expect(defaultProfile().creatorHelpSeen).toBe(false);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let seen: unknown;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify({ version: 1, creatorHelpSeen: seen }) },
  });
  try {
    expect(loadProfile().creatorHelpSeen).toBe(false);
    seen = true;
    expect(loadProfile().creatorHelpSeen).toBe(true);
    seen = 'true';
    expect(loadProfile().creatorHelpSeen).toBe(false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
