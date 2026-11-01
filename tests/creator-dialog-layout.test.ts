import { expect, test } from 'bun:test';
import { CREATOR_DIALOGS, creatorDialogFrame } from '../src/game/core/creator-dialogs';

test('creator dialog metadata retains authored frames, input limits and device font distinctions', () => {
  expect(CREATOR_DIALOGS.symbol).toBe(1070);
  expect(CREATOR_DIALOGS.frames.map((frame) => frame.frame)).toEqual([1, 2, 3, 7]);
  const form = creatorDialogFrame(2);
  expect(form.fields.map((field) => [field.name, field.maxLength, field.initialText])).toEqual([
    ['author_txt', 20, 'Type your name...'],
    ['tank_txt', 25, ''],
  ]);
  expect(form.fields[0]).toMatchObject({
    x: 207.9,
    y: 181.5,
    width: 270.05,
    fontId: 131,
    deviceFont: false,
  });
  expect(creatorDialogFrame(1).fields[0]).toMatchObject({
    initialText: 'Are you sure you want to exit without saving?\r',
    deviceFont: true,
  });
  expect(creatorDialogFrame(3).fields[0]).toMatchObject({
    name: 'data_txt',
    x: 54.05,
    y: 180.25,
    width: 437.95,
    height: 48.05,
    deviceFont: true,
  });
  expect(creatorDialogFrame(7).fields[0]).toMatchObject({
    name: 'message_txt',
    fontId: 142,
    bold: true,
  });
});

test('creator dialog states retain button text and positive bounds without original contours', () => {
  expect(creatorDialogFrame(1).buttons.map((button) => button.name)).toEqual([
    'cancel_btn',
    'exit_btn',
  ]);
  const copy = creatorDialogFrame(3).buttons.find((button) => button.name === 'Copy_btn')!;
  expect(copy.matrix).toMatchObject({ tx: 5591, ty: 3030 });
  expect(copy.fields.up[0].initialText).toBe('Copy Code to Clipboard\r');
  const allowed = new Set([
    'kind',
    'id',
    'matrix',
    'bounds',
    'boundsMatrix',
    'fill',
    'stroke',
    'glyphs',
    'font',
    'bold',
    'italic',
  ]);
  for (const frame of CREATOR_DIALOGS.frames) {
    const art = [...frame.art];
    for (const button of frame.buttons) {
      expect(button.bounds.width > 0 && button.bounds.height > 0).toBe(true);
      for (const state of ['up', 'over', 'down'] as const) {
        expect(button.fields[state].length).toBeGreaterThan(0);
        art.push(...button.variants[state]);
      }
    }
    expect(art.every((leaf) => Object.keys(leaf).every((key) => allowed.has(key)))).toBe(true);
    expect(
      art.filter((leaf) => leaf.kind === 'text').every((leaf) => typeof leaf.font === 'string'),
    ).toBe(true);
  }
});
