import { expect, test } from 'bun:test';
import { MAIN_MENU, MainMenuMotion } from '../src/game/core/main-menu';
import { displayAlpha } from '../src/game/core/display-values';

function advance(menu: MainMenuMotion, frames: number) {
  for (let i = 0; i < frames; i++) menu.advance();
}
test('main-menu controls fade while parked and restore on countdown frame96', () => {
  const menu = new MainMenuMotion();
  expect(menu).toMatchObject({ age: 0, parked: true, titleAlpha: 1, controlAlpha: 0 });
  menu.advance();
  expect(menu.controlAlpha).toBe(12 / 256);
  advance(menu, 94);
  expect(menu.parked).toBe(true);
  expect(menu.controlAlpha).toBeGreaterThanOrEqual(1);
  menu.advance();
  expect(menu.parked).toBe(false);
  expect(menu.age).toBe(96);
  expect(menu.titleAlpha).toBe(1);
});
test('Settings/Credits begin fading immediately but lock actions for31 Run calls', () => {
  const menu = new MainMenuMotion();
  advance(menu, 96);
  const alpha = menu.controlAlpha;
  expect(menu.open()).toBe(true);
  expect(menu.busy).toBe(true);
  expect(menu.open()).toBe(false);
  expect(menu.back()).toBe(false);
  menu.advance();
  expect(menu.controlAlpha).toBe(displayAlpha(alpha - 0.05));
  expect(menu.titleAlpha).toBe(displayAlpha(0.95));
  advance(menu, 29);
  expect(menu).toMatchObject({ parked: false, busy: true });
  expect(menu.controlAlpha).toBeLessThanOrEqual(0);
  menu.advance();
  expect(menu).toMatchObject({ parked: true, busy: false });
  const age = menu.age,
    before = menu.titleAlpha;
  expect(menu.back()).toBe(true);
  expect(menu.parked).toBe(false);
  expect(menu.age).toBe(age);
  menu.advance();
  expect(menu.titleAlpha).toBe(displayAlpha(before + 0.05));
  advance(menu, 30);
  expect(menu.titleAlpha).toBeGreaterThanOrEqual(1);
});
test('Play glow retains source floating-point overshoot/reversal and continues behind overlays', () => {
  const menu = new MainMenuMotion();
  advance(menu, 39);
  expect(menu.glowStrength).toBeCloseTo(1.95);
  menu.advance();
  expect(menu.glowStrength).toBeGreaterThan(2);
  menu.advance();
  expect(menu.glowStrength).toBeCloseTo(1.95);
  advance(menu, 55);
  menu.open();
  const before = menu.glowStrength;
  menu.advance();
  expect(menu.glowStrength).not.toBe(before);
});
test('numeric registrations preserve authored placement/scale and stable symbol identities', () => {
  expect(MAIN_MENU.background).toBe(487);
  expect(MAIN_MENU.title.symbol).toBe(545);
  expect(MAIN_MENU.title.matrix.tx / 20).toBe(55.3);
  expect(MAIN_MENU.controls.map((p) => p.symbol)).toEqual([492, 494, 496, 498, 500, 502]);
  expect(MAIN_MENU.controls[0].matrix.a).toBe(3.399993896484375);
  expect(MAIN_MENU.controls[0].matrix.tx / 20).toBe(207.85);
});
