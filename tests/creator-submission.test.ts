import { expect, test } from 'bun:test';
import {
  acceptsCreatorNameInput,
  acceptsCreatorNameEdit,
  EMPTY_CREATOR_SUBMISSION,
} from '../src/game/core/creator-dialogs';
import { defaultProfile, submitCreatedTank } from '../src/game/services/profile';
import { STARTER, difficulty } from '../src/game/data/catalog';

test('creator submissions consume failed IDs without saving, awarding or mutating the profile', () => {
  const profile = { ...defaultProfile(), tanks: [STARTER], achievements: ['Existing'] };
  let current = profile;
  for (const invalid of [
    { ...STARTER, parts: [] },
    { ...STARTER, name: '' },
    { ...STARTER, author: '' },
  ]) {
    const result = submitCreatedTank(current, invalid);
    expect(result.tank).toBeNull();
    expect(result.profile.nextTankId).toBe(current.nextTankId + 1);
    expect(result.profile.tanks).toBe(current.tanks);
    expect(result.profile.achievements).toBe(current.achievements);
    current = result.profile;
  }
  const design = { ...STARTER, name: '  A Tank  ', author: "Alice O'Brien", difficulty: -12345 };
  const first = submitCreatedTank(current, design);
  expect(first.tank).toMatchObject({
    id: 'L10000004',
    name: design.name,
    author: design.author,
    difficulty: difficulty(design),
  });
  expect(first.tank?.sourceCode).toBeUndefined();
  const second = submitCreatedTank(first.profile, first.tank!);
  expect(second.tank?.id).toBe('L10000005');
  expect(second.profile.tanks).toHaveLength(3);
  expect(second.profile.tanks[1]).toBe(first.tank!);
  expect(second.profile.achievements).not.toContain('Tank Creator');
  const third = submitCreatedTank(second.profile, design);
  expect(third.profile.achievements).toEqual(['Existing', 'Tank Creator']);
  expect(profile.nextTankId).toBe(10000001);
  expect(profile.tanks).toEqual([STARTER]);
  expect(EMPTY_CREATOR_SUBMISSION).toBe('You cannot submit tanks with nothing in them...Thanks!');
});

test('creator submission checks empty strings, preserving whitespace and existing imported punctuation', () => {
  for (const name of [' ', 'Legacy: Tank']) {
    const result = submitCreatedTank(defaultProfile(), { ...STARTER, name, author: ' ' });
    expect(result.tank).toMatchObject({ name, author: ' ', id: 'L10000001' });
  }
});

test('creator name TextEvents reject entire invalid chunks rather than filtering individual characters', () => {
  expect(acceptsCreatorNameInput("AZaz09 _-'")).toBe(true);
  expect(acceptsCreatorNameInput('')).toBe(true);
  for (const incoming of ['valid!', 'line\nbreak', 'tab\t', 'é', '😀', ':', 'A.B', 'A/B'])
    expect(acceptsCreatorNameInput(incoming)).toBe(false);
});

test('browser name edit fallback validates only the inserted span around retained punctuation', () => {
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy: Tank 2')).toBe(true);
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy:')).toBe(true);
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy: Rover')).toBe(true);
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy: Tank')).toBe(true);
  expect(acceptsCreatorNameEdit('Legacy: Tank', '')).toBe(true);
  expect(acceptsCreatorNameEdit('Tank', 'Tank!')).toBe(false);
  expect(acceptsCreatorNameEdit('Tank', 'T:a!nk')).toBe(false);
  expect(acceptsCreatorNameEdit('Tank', 'T:newank')).toBe(false);
});
