import { expect, test } from 'bun:test';
import { CreatorAlertClock } from '../src/game/core/creator-alert';
import { creatorSavePrerequisite, CREATOR_AUTHOR } from '../src/game/core/creator-save';
import { CREATOR_DIALOGS } from '../src/game/core/creator-dialogs';
import { STARTER } from '../src/game/data/catalog';

test('creator alert waits for its independent Timer, then fades for 86 fixed8 interface frames', () => {
  const clock = new CreatorAlertClock();
  clock.show('Missing body');
  clock.step(500);
  expect(clock.visible).toBe(true);
  expect(clock.alpha).toBe(1);
  clock.timerComplete();
  clock.step();
  expect(clock.alpha).toBe(253 / 256);
  clock.step(49);
  expect(clock.alpha).toBe(106 / 256);
  expect(clock.visible).toBe(true);
  clock.step(35);
  expect(clock.alpha).toBe(1 / 256);
  expect(clock.visible).toBe(true);
  clock.step();
  expect(clock.visible).toBe(false);
  expect(clock.alpha).toBe(1);
  expect(clock.fading).toBe(false);
});

test('click dismissal stops the Timer but preserves an existing hidden fade and reused alpha', () => {
  const clock = new CreatorAlertClock();
  clock.show('First');
  clock.dismiss();
  clock.timerComplete();
  clock.step(100);
  expect(clock.alpha).toBe(1);
  expect(clock.fading).toBe(false);
  clock.show('Second');
  clock.timerComplete();
  clock.step(30);
  clock.dismiss();
  clock.step(10);
  clock.show('Third');
  expect(clock.alpha).toBe(136 / 256);
  expect(clock.message).toBe('Third');
  clock.step(46);
  expect(clock.visible).toBe(false);
  expect(clock.alpha).toBe(1);
  // _-80 does not stop the newer Timer when its older fade ends.
  expect(clock.timerRunning).toBe(true);
  clock.timerComplete();
  clock.step(100);
  expect(clock.alpha).toBe(1);
});

test('SaveExitMouseUp checks avatar weapon before body using all non-body catalog categories', () => {
  const body = STARTER.parts.find((p) => Math.floor(p.type / 1000) === 1)!,
    design = { ...STARTER, parts: [] };
  expect(creatorSavePrerequisite(design)).toBe(
    'You must have at least 1 weapon to save an Avatar tank',
  );
  expect(creatorSavePrerequisite({ ...design, avatar: false })).toBe(
    'You must have at least 1 bubble to save a tank',
  );
  expect(creatorSavePrerequisite({ ...design, parts: [body] })).toContain('weapon');
  for (const type of [2001, 3001, 4001, 5001, 6001, 7001]) {
    const attachment = { ...body, type };
    expect(creatorSavePrerequisite({ ...design, parts: [attachment] })).toContain('bubble');
    expect(creatorSavePrerequisite({ ...design, parts: [body, attachment] })).toBeNull();
  }
  expect(CREATOR_AUTHOR).toBe('BubbleTanks3');
  expect(CREATOR_DIALOGS.alert.symbol).toBe(937);
  expect(CREATOR_DIALOGS.alert.fields[0]).toMatchObject({
    name: 'description_txt',
    x: 46.95,
    y: 205.9,
    size: 20,
  });
});
