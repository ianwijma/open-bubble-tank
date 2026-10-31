import { expect, test } from 'bun:test';
import {
  canonicalHotkey,
  hotkeyLabel,
  hotkeyDirections,
  validHotkey,
} from '../src/game/core/hotkeys';
import { validateSettings } from '../src/game/services/profile';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';

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
