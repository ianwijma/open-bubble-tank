import { expect, test } from 'bun:test';
import { SettingsMotion, SETTINGS_SCREEN } from '../src/game/core/settings-screen';

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
  for (let i = 0; i < 35; i++) m.advance(true, true);
  expect(m.hotkeys.Paused_mc.y).toBeGreaterThanOrEqual(400);
  expect(m.hotkeys.btnBack_mc.y).toBe(563.45);
  expect(m.hotkeys.Locked_mc.y).toBe(563.45);
  m.advance(true, true);
  // Both rows use Pause's newly stored y, independently of Back's still-parked y.
  expect(m.hotkeys.Paused_mc.y).toBe(398.8);
  expect(m.hotkeys.btnBack_mc.y).toBe(543.85);
  expect(m.hotkeys.Locked_mc.y).toBe(539.35);
  for (let i = 36; i < 120; i++) m.advance(true, true);
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
