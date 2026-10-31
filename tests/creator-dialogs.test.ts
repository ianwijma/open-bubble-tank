import { expect, test } from 'bun:test';
import {
  creatorDialogFrame,
  acceptsCreatorNameInput,
  acceptsCreatorNameEdit,
} from '../src/game/core/creator-dialogs';
import { defaultProfile, submitCreatedTank } from '../src/game/services/profile';
import { STARTER } from '../src/game/data/catalog';
test('creator submissions reserve failed IDs, keep names verbatim and save fresh copies', () => {
  const profile = defaultProfile();
  const invalid = submitCreatedTank(profile, { ...STARTER, name: '', author: 'Alice' });
  expect(invalid.tank).toBeNull();
  expect(invalid.profile.tanks).toHaveLength(0);
  expect(invalid.profile.nextTankId).toBe(10000002);
  const first = submitCreatedTank(invalid.profile, {
    ...STARTER,
    name: '  A Tank  ',
    author: "Alice O'Brien",
  });
  expect(first.tank).toMatchObject({
    id: 'L10000002',
    name: '  A Tank  ',
    author: "Alice O'Brien",
  });
  const second = submitCreatedTank(first.profile, first.tank!);
  expect(second.tank?.id).toBe('L10000003');
  expect(second.profile.tanks).toHaveLength(2);
  expect(profile.nextTankId).toBe(10000001);
});
test('creator name TextEvents reject whole invalid chunks but permit edits around imported punctuation', () => {
  expect(acceptsCreatorNameInput("A-z_9 O'Brien")).toBe(true);
  expect(acceptsCreatorNameInput('valid!')).toBe(false);
  expect(acceptsCreatorNameInput('line\nbreak')).toBe(false);
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy: Tank 2')).toBe(true);
  expect(acceptsCreatorNameEdit('Legacy: Tank', 'Legacy:')).toBe(true);
  expect(acceptsCreatorNameEdit('Tank', 'Tank!')).toBe(false);
  const form = creatorDialogFrame(2);
  expect(form.fields.find((f) => f.name === 'author_txt')?.maxLength).toBe(20);
  expect(form.fields.find((f) => f.name === 'tank_txt')?.maxLength).toBe(25);
  expect(creatorDialogFrame(1).buttons.map((b) => b.name)).toEqual(['cancel_btn', 'exit_btn']);
  for (const frame of [1, 2, 3, 7] as const)
    for (const button of creatorDialogFrame(frame).buttons) {
      expect(button.bounds.width).toBeGreaterThan(0);
      expect(button.bounds.height).toBeGreaterThan(0);
      expect(button.fields.up).not.toHaveLength(0);
    }
});
