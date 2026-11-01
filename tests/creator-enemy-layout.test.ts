import { expect, test } from 'bun:test';
import { CREATOR_PALETTE } from '../src/game/core/creator-palette';

test('advanced enemy layout retains authored field, slider and suggestion registrations', () => {
  const a = CREATOR_PALETTE.advanced;
  expect(a.origin).toEqual(CREATOR_PALETTE.origin);
  expect([a.tab.symbol, a.basicTab.symbol]).toEqual([899, 802]);
  expect(a.fields.map((f) => [f.name, f.x, f.y, f.align, f.wordWrap])).toEqual([
    ['LifeMax_txt', 122, 59, 0, true],
    ['BubblesReturnedMax_txt', 122, 100, 0, true],
    ['SpeedMax_txt', 122, 138, 0, true],
    ['LifeCurrent_txt', 77, 59, 1, false],
    ['BubblesReturnedCurrent_txt', 77, 100, 1, false],
    ['SpeedCurrent_txt', 77, 138, 1, false],
  ]);
  expect(a.fields.every((f) => f.initialText === '10000' && f.fontId === 741)).toBe(true);
  expect(a.sliders.map((s) => [s.name, s.matrix.tx, s.matrix.ty])).toEqual([
    ['LifeSlider_mc', 907, 1283],
    ['BubblesReturnedSlider_mc', 907, 2095],
    ['SpeedSlider_mc', 907, 2849],
  ]);
  for (const slider of a.sliders) {
    expect(slider.matrix.a).toBe(33777 / 65536);
    expect(slider.handle.matrix).toMatchObject({ tx: 590, ty: 45 });
    expect(slider.handle.variants).toHaveLength(2);
  }
  expect(a.suggested.bounds).toEqual({ x: -54.15, y: -6, width: 130, height: 12 });
  expect(a.suggested.art).toHaveLength(2);
});

test('confirmation metadata retains morph poses, nested text fades and independent button states', () => {
  const c = CREATOR_PALETTE.advanced.confirm,
    frame = (n: number) => c.frames.find((f) => f.frame === n)!;
  expect(c.matrix).toMatchObject({ tx: -1530, ty: 2565 });
  expect(c.frames.map((f) => f.frame)).toEqual(Array.from({ length: 21 }, (_, i) => i + 2));
  expect(frame(2).fields).toHaveLength(0);
  expect(frame(7).art[0]).toMatchObject({ id: 901, bounds: { xMin: -1288 } });
  expect(frame(17).art[0]).toMatchObject({ id: 914, bounds: { xMin: -1288 } });
  expect(frame(10).fields.map((f) => f.color[3])).toEqual([223.125, 223.125, 255]);
  expect(frame(12).fields.map((f) => [f.initialText, f.x, f.y])).toEqual([
    ['no', 28, 9.75],
    ['yes', -44, 8.75],
    ['Using suggested settings will wipe current settings.', -68, -27.45],
  ]);
  expect(frame(15).fields.map((f) => f.color[3])).toEqual([0, 0, 255]);
  expect(c.buttons.map((b) => [b.name, b.matrix.tx, b.bounds.width])).toEqual([
    ['btnNo', 700, 48],
    ['btnYes', -700, 48],
  ]);
  for (const button of c.buttons)
    expect(button.art.map((pose) => pose[0].fill?.[3])).toEqual([153, 57, 57]);
});
