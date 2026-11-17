import { expect, test } from 'bun:test';
import { menuLocal, mockMenuTarget, sameMenuTarget } from '../src/game/core/menu-hit';
import { MAIN_MENU } from '../src/game/core/main-menu';

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
});

test('procedural buttons reject empty bounding-box corners but retain their painted ellipse centers', () => {
  for (const p of MAIN_MENU.controls) {
    const { matrix: m, bounds: b } = p;
    const center = {
      x: m.tx / 20 + (b.x + b.width / 2) * m.a,
      y: m.ty / 20 + (b.y + b.height / 2) * m.d,
    };
    expect(mockMenuTarget(center)).toEqual({ kind: 'control', name: p.name });
    const corner = { x: m.tx / 20 + (b.x + 0.1) * m.a, y: m.ty / 20 + (b.y + 0.1) * m.d };
    expect(mockMenuTarget(corner)).toBeUndefined();
  }
});

test('menu inversion keeps valid minimum 16.16 scale coefficients', () => {
  const scale = 1 / 65536;
  expect(
    menuLocal(
      { x: 10 + 2 * scale, y: 20 + 3 * scale },
      { a: scale, b: 0, c: 0, d: scale, tx: 200, ty: 400 },
    ),
  ).toEqual({ x: 2, y: 3 });
});
