import { expect, test } from 'bun:test';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import {
  changeSetting,
  MenuSettingsState,
  settingSelection,
} from '../src/game/core/settings-screen';
import {
  defaultProfile,
  loadProfile,
  restoreSettings,
  saveProfile,
  validateSettings,
} from '../src/game/services/profile';

test('efficiency changes the live stage rate without overwriting Main.mainFPS', () => {
  const slow = changeSetting(DEFAULT_SETTINGS, 'fps', 35);
  const efficient = changeSetting(slow, 'efficient', true);
  expect([efficient.fps, efficient.mainFps, efficient.efficient]).toEqual([90, 35, true]);
  const regular = changeSetting(efficient, 'efficient', false);
  expect([regular.fps, regular.mainFps, regular.efficient]).toEqual([50, 35, false]);
  const fast = changeSetting(efficient, 'fps', 65);
  expect([fast.fps, fast.mainFps, fast.efficient]).toEqual([65, 65, true]);
  expect(changeSetting(slow, 'fps', 90)).toBe(slow);
});
test('a menu instance retains its selector while a newly constructed menu reads the saved rate', () => {
  const menu = new MenuSettingsState(35);
  const efficient = changeSetting({ ...DEFAULT_SETTINGS, fps: 35, mainFps: 35 }, 'efficient', true);
  menu.change('efficient', true);
  expect(settingSelection(efficient, 'fps', false, menu)).toBe(65);
  expect(settingSelection(efficient, 'fps', true, menu)).toBe(35);
  const rebuilt = new MenuSettingsState(efficient.mainFps);
  expect(settingSelection(efficient, 'fps', false, rebuilt)).toBe(35);
  const off = changeSetting(efficient, 'efficient', false);
  menu.change('efficient', false);
  expect([settingSelection(off, 'fps', false, menu), off.fps, off.mainFps]).toEqual([50, 50, 35]);
  expect(settingSelection(off, 'fps', true, menu)).toBe(35);
  expect(settingSelection(off, 'fps', false, new MenuSettingsState(off.mainFps))).toBe(35);
});
test('SaveGameData persists the preferred rate and lower-level flags without mutating live settings', () => {
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
    const settings = changeSetting(
      { ...DEFAULT_SETTINGS, fps: 35, mainFps: 35, zoom: 0.65 },
      'efficient',
      true,
    );
    expect(saveProfile({ ...defaultProfile(), settings })).toBe(true);
    const saved = JSON.parse(stored!).settings;
    expect([
      saved.fps,
      saved.efficient,
      saved.music,
      saved.sound,
      saved.shake,
      saved.quality,
      saved.zoom,
    ]).toEqual([35, false, false, false, false, 'low', 0.65]);
    expect(saved.mainFps).toBeUndefined();
    expect([settings.fps, settings.mainFps, settings.efficient]).toEqual([90, 35, true]);
    const reloaded = loadProfile().settings;
    expect([
      reloaded.fps,
      reloaded.mainFps,
      reloaded.efficient,
      reloaded.quality,
      reloaded.music,
    ]).toEqual([35, 35, false, 'low', false]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
test('legacy rates migrate without pretending that a lost90FPS preference can be recovered', () => {
  expect(restoreSettings({ fps: 65, music: false })).toMatchObject({
    fps: 65,
    mainFps: 65,
    efficient: false,
    music: false,
  });
  expect(restoreSettings({ fps: 90, efficient: true, quality: 'low' })).toMatchObject({
    fps: 50,
    mainFps: 50,
    efficient: false,
    quality: 'low',
  });
  expect(restoreSettings({ fps: 90, mainFps: 35, efficient: true })).toMatchObject({
    fps: 35,
    mainFps: 35,
    efficient: false,
  });
  expect(validateSettings({ fps: 90, mainFps: 65, efficient: true })).toMatchObject({
    fps: 90,
    mainFps: 65,
    efficient: true,
  });
  expect(restoreSettings({ fps: 35, mainFps: 12345 })).toMatchObject({ fps: 35, mainFps: 35 });
});
