import { expect, test } from 'bun:test';
import { TANK_VIEWER, viewerRoot, viewerWidget } from '../src/game/core/tank-viewer';

test('viewer layout retains source four-row registrations, local mask and invisible fit helper', () => {
  expect(TANK_VIEWER.symbol).toBe(1413);
  expect([1, 2, 3, 4].map((i) => viewerRoot(`TankLoad${i}_mc`).matrix)).toEqual([
    { a: 1, b: 0, c: 0, d: 1, tx: 2295, ty: 2020 },
    { a: 1, b: 0, c: 0, d: 1, tx: 6695, ty: 2020 },
    { a: 1, b: 0, c: 0, d: 1, tx: 2295, ty: 5860 },
    { a: 1, b: 0, c: 0, d: 1, tx: 6695, ty: 5860 },
  ]);
  expect(TANK_VIEWER.mask).toEqual({ x: -106.55, y: -92.7, width: 213.05, height: 185.4 });
  expect(TANK_VIEWER.helper).toEqual({ x: -6.5, y: -6.5, width: 13, height: 13 });
  expect(TANK_VIEWER.rowBounds.width).toBeCloseTo(218.4497200012207, 10);
  expect(TANK_VIEWER.rowBounds.height).toBeCloseTo(191.15131530761718, 10);
});

test('viewer fields keep local text bounds separate from authored placement matrices and font advances', () => {
  const row = viewerWidget(1176);
  expect(row.fields.map((f) => f.name)).toEqual(['largeName_txt', 'largeAuthor_txt']);
  for (const field of row.fields) {
    expect(field.matrix.a).toBe(1);
    expect(field.matrix.d).toBe(1);
    expect(field.advances?.A).toBeGreaterThan(0);
    expect(field.lineHeight).toBeGreaterThan(field.size);
  }
  expect(
    viewerWidget(1386, 4).fields.find((f) => f.name === 'txtPleaseEnterBelow_txt')?.initialText,
  ).toBe('Please Enter Tank  Code Below');
  expect(viewerWidget(1129).fields.map((f) => f.name)).toEqual([
    'bubblesLeft_txt',
    'gunPoints_txt',
    'PrimarySecondary_txt',
    'class_txt',
    'primary_txt',
    'secondary_txt',
    'passive_txt',
  ]);
});

test('viewer lookup retains all authored sort poses and clamps one-frame button states', () => {
  expect(TANK_VIEWER.widgets).toHaveLength(134);
  expect(new Set(TANK_VIEWER.widgets.map((w) => `${w.symbol}:${w.frame}`)).size).toBe(134);
  for (const symbol of [1218, 1222])
    expect(TANK_VIEWER.widgets.filter((w) => w.symbol === symbol).map((w) => w.frame)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  expect(viewerWidget(1205, 2).frame).toBe(1);
  expect(viewerWidget(1222, 100).frame).toBe(10);
  expect(TANK_VIEWER.sortIconMatrix).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: -91, ty: 0 });
});

test('viewer statistics retain source gradient, closed mask and nonlinear ten-frame expansion', () => {
  const s = TANK_VIEWER.statistics;
  expect(s.closed).toEqual(s.frames[0].mask);
  expect(s.frames.map((f) => Math.round(f.mask.height * 100))).toEqual([
    1465, 4295, 6790, 8950, 10780, 12280, 13445, 14275, 14775, 14940,
  ]);
  expect(s.background.stops).toEqual([
    { ratio: 0, color: [35, 151, 170] },
    { ratio: 255, color: [35, 104, 131] },
  ]);
  expect(viewerWidget(1137, 1).staticDepths).toContain(1);
  expect(viewerWidget(1137, 2).staticDepths).toContain(1);
});

test('offline guide metadata clips retired upper callout and leaves local copy as an independent field', () => {
  const guide = viewerWidget(1412, 2);
  expect(guide.clips).toEqual([
    { symbol: 1406, bounds: { x: 38, y: 185, width: 356.95, height: 193 } },
  ]);
  expect(guide.art.filter((p) => p.id === 1406).map((p) => p.bounds.yMin / 20)).toEqual([
    185, 278, 295.05,
  ]);
  expect(guide.art.some((p) => [1407, 1408, 1409].includes(p.id))).toBe(false);
  expect(TANK_VIEWER.guideNote).toMatchObject({
    symbol: 1407,
    font: 'Arial',
    size: 16,
    lineHeight: 19,
    wordWrap: true,
    matrix: { tx: -347, ty: 5967 },
  });
});
