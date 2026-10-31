import { expect, test } from 'bun:test';
import {
  SettingsMotion,
  SETTINGS_SCREEN,
  changeSetting,
  settingSelection,
  MenuSettingsState,
} from '../src/game/core/settings-screen';
import {
  hotkeyLabel,
  validHotkey,
  canonicalHotkey,
  hotkeyDirections,
} from '../src/game/core/hotkeys';
import { validateSettings } from '../src/game/services/profile';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
test('pause settings use sequential local-Y gates, same-frame setters and retained exit positions', () => {
  const m = new SettingsMotion();
  m.advance(false, false);
  expect(m.settings.Title_mc.y).toBe(340.45);
  m.advance(true, false);
  expect(m.settings.Title_mc.y).toBe(289.4);
  expect(m.settings.FrameRate_mc.y).toBe(340.45);
  for (let i = 0; i < 3; i++) m.advance(true, false);
  expect(m.settings.Title_mc.y).toBe(164.85);
  expect(m.settings.FrameRate_mc.y).toBe(294.8);
  expect(m.settings.Quality_mc.y).toBe(340.45);
  const before = JSON.stringify(m.settings);
  m.advance(false, false, true);
  expect(JSON.stringify(m.settings)).toBe(before);
  m.advance(false, false);
  expect(m.settings.Title_mc.y).toBeGreaterThan(164.85);
  m.advance(true, false);
  expect(m.settings.Title_mc.y).toBeLessThan(164.85);
});
test('hotkey Back shares the Pause-row gate and returning history freezes outside settings', () => {
  const m = new SettingsMotion();
  for (let i = 0; i < 120; i++) m.advance(true, true);
  expect(m.hotkeys.btnBack_mc.y).toBeLessThan(400);
  expect(m.hotkeys.Paused_mc.y).toBeLessThan(300);
  m.returning = true;
  m.advance(true, false);
  const y = m.hotkeys.Up_mc.y;
  expect(y).toBeGreaterThan(181.25);
  for (let i = 0; i < 10; i++) m.advance(false, false);
  expect(m.hotkeys.Up_mc.y).toBe(y);
  expect(SETTINGS_SCREEN.menu.settings.origin).toEqual({ x: 210, y: 90 });
  expect(SETTINGS_SCREEN.pause.settings.origin).toEqual({ x: 274.5, y: 224.5 });
});
test('Flash key codes preserve punctuation, duplicate bindings and left/right modifier equivalence', () => {
  for (const code of [
    'ShiftLeft',
    'ShiftRight',
    'ControlRight',
    'Space',
    'Tab',
    'Escape',
    'Semicolon',
    'Numpad3',
    'F1',
  ])
    expect(validHotkey(code)).toBe(true);
  for (const code of ['', 'KeyZZ', 'unidentified', 'constructor'])
    expect(validHotkey(code)).toBe(false);
  expect(canonicalHotkey('ShiftRight')).toBe('ShiftLeft');
  expect(hotkeyLabel('ShiftRight')).toBe('SHIFT');
  expect(hotkeyLabel('Semicolon')).toBe(';');
  expect(hotkeyLabel('Numpad3')).toBe('NUMPAD 3');
  expect(hotkeyLabel('F1')).toBe('p'); // _-Ay's unassigned toUpperCase return preserves this quirk.
  const settings = validateSettings({
    ...DEFAULT_SETTINGS,
    h1: 'ShiftRight',
    h2: 'ShiftLeft',
    h5: 'Escape',
  });
  expect([settings.h1, settings.h2, settings.h5]).toEqual(['ShiftLeft', 'ShiftLeft', 'Escape']);
  expect(
    hotkeyDirections(new Set(['ShiftLeft']), { ...settings, h3: 'ShiftLeft', h4: 'ShiftLeft' }),
  ).toEqual({ up: true, down: false, left: true, right: false });
});
test('changing FPS preserves efficiency mode, while the source efficiency toggle resets its coupled settings', () => {
  const efficient = changeSetting(DEFAULT_SETTINGS, 'efficient', true);
  expect([
    efficient.fps,
    efficient.music,
    efficient.sound,
    efficient.shake,
    efficient.quality,
  ]).toEqual([90, false, false, false, 'low']);
  expect(changeSetting(efficient, 'fps', 35).efficient).toBe(true);
  const menu = new MenuSettingsState(DEFAULT_SETTINGS.mainFps);
  menu.change('efficient', true);
  expect(settingSelection(efficient, 'fps', false, menu)).toBe(65);
  expect(settingSelection(efficient, 'fps', true)).toBe(90);
  expect(changeSetting({ ...efficient, zoom: 0.7 }, 'efficient', false)).toEqual({
    ...DEFAULT_SETTINGS,
    zoom: 0.7,
  });
});
