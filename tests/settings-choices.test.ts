import { expect, test } from 'bun:test';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import {
  changeSetting,
  MenuSettingsState,
  settingSelection,
} from '../src/game/core/settings-screen';

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
  expect(settingSelection(efficient, 'fps', true)).toBe(50);
  expect(changeSetting({ ...efficient, zoom: 0.7 }, 'efficient', false)).toEqual({
    ...DEFAULT_SETTINGS,
    zoom: 0.7,
  });
});
