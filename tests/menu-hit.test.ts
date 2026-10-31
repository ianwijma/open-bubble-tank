import { expect, test } from 'bun:test';
import { menuLocal, mockMenuTarget, sameMenuTarget } from '../src/game/core/menu-hit';
import { MAIN_MENU, MainMenuMotion } from '../src/game/core/main-menu';

test('menu picking inverts full twip matrices, including rotated nonuniform scales', () => {
  expect(menuLocal({ x: 7, y: 24 }, { a: 0, b: 2, c: -3, d: 0, tx: 200, ty: 400 })).toEqual({
    x: 2,
    y: 1,
  });
  expect(menuLocal({ x: 0, y: 0 }, { a: 0, b: 0, c: 0, d: 0, tx: 0, ty: 0 })).toBeUndefined();
});

test('pointer targets retain identity across frame probes while distinguishing inert wrappers', () => {
  expect(sameMenuTarget(undefined, undefined)).toBe(true);
  expect(
    sameMenuTarget({ kind: 'control', name: 'play_btn' }, { kind: 'control', name: 'play_btn' }),
  ).toBe(true);
  expect(
    sameMenuTarget({ kind: 'control', name: 'play_btn' }, { kind: 'decoration', name: 'play_btn' }),
  ).toBe(false);
  expect(sameMenuTarget({ kind: 'series' }, { kind: 'series', name: 'bt_mc' })).toBe(false);
});

test('procedural buttons reject empty bounding-box corners but retain their painted ellipse centers', () => {
  const motion = new MainMenuMotion();
  for (const p of MAIN_MENU.controls) {
    const { matrix: m, bounds: b } = p;
    const center = {
      x: m.tx / 20 + (b.x + b.width / 2) * m.a,
      y: m.ty / 20 + (b.y + b.height / 2) * m.d,
    };
    expect(mockMenuTarget(center, motion)).toEqual({ kind: 'control', name: p.name });
    const corner = { x: m.tx / 20 + (b.x + 0.1) * m.a, y: m.ty / 20 + (b.y + 0.1) * m.d };
    expect(mockMenuTarget(corner, motion)).toBeUndefined();
  }
});

test('procedural series uses the capsule and transparent link primitives, including the round final end', () => {
  const motion = new MainMenuMotion();
  expect(mockMenuTarget({ x: 5.1, y: 420.1 }, motion)).toBeUndefined();
  expect(mockMenuTarget({ x: 50, y: 431 }, motion)).toEqual({ kind: 'series' });
  motion.series.hover(true);
  for (let i = 0; i < 8; i++) motion.advance();
  expect(mockMenuTarget({ x: 175, y: 431 }, motion)).toEqual({ kind: 'series', name: 'bt_mc' });
  expect(mockMenuTarget({ x: 405.5, y: 431 }, motion)).toEqual({ kind: 'series', name: 'bttd_mc' });
  expect(mockMenuTarget({ x: 405.5, y: 420.1 }, motion)).toBeUndefined();
});

test('menu inversion keeps valid minimum16.16 SWF scale coefficients', () => {
  const scale = 1 / 65536;
  expect(
    menuLocal(
      { x: 10 + 2 * scale, y: 20 + 3 * scale },
      { a: scale, b: 0, c: 0, d: scale, tx: 200, ty: 400 },
    ),
  ).toEqual({ x: 2, y: 3 });
});

test('procedural link picking follows every authored birth and removal frame', () => {
  const motion = new MainMenuMotion();
  const controls = [
    { name: 'bt_mc', birth: 4, removal: 18, x: 175 },
    { name: 'bt2_mc', birth: 6, removal: 16, x: 235.8 },
    { name: 'bta_mc', birth: 8, removal: 14, x: 300.1 },
    { name: 'bttd_mc', birth: 10, removal: 12, x: 369.025 },
  ] as const;
  for (let frame = 1; frame <= 19; frame++) {
    motion.series.pose.gotoAndStop(frame);
    for (const control of controls) {
      const target = mockMenuTarget({ x: control.x, y: 431 }, motion);
      if (frame >= control.birth && frame < control.removal)
        expect(target).toEqual({ kind: 'series', name: control.name });
      else expect(target?.kind === 'series' && target.name === control.name).toBe(false);
    }
  }
});
