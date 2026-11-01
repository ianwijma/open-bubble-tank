import { expect, test } from 'bun:test';
import { CREATOR_PALETTE } from '../src/game/core/creator-palette';
import { PARTS } from '../src/game/data/catalog';
test('source palette metadata retains original preview registration, row dimensions and dynamic font variants', () => {
  expect(CREATOR_PALETTE.origin).toMatchObject({ tx: 7840, ty: 100 });
  expect(CREATOR_PALETTE.library.mask).toEqual({ x: 6, y: 83.05, width: 119, height: 182 });
  expect(CREATOR_PALETTE.tabs.map((tab) => [tab.name, tab.category])).toEqual([
    ['body_mc', 1],
    ['primary_mc', 2],
    ['secondary_mc', 3],
    ['interface_mc', 5],
    ['EnemyWeapons_mc', 4],
    ['behavior_mc', 6],
  ]);
  expect(CREATOR_PALETTE.scroll.pieces.find((piece) => piece.name === 'down_mc')!.matrix).toEqual({
    a: -1,
    b: 0,
    c: 0,
    d: -1,
    tx: 310,
    ty: 3650,
  });
  expect(CREATOR_PALETTE.library.preview).toEqual({
    x: 76,
    y: 40.5,
    bounds: { x: -70, y: -33.5, width: 141, height: 67 },
  });
  expect(CREATOR_PALETTE.row.height).toBe(20);
  expect(CREATOR_PALETTE.row.fields.find((f) => f.name === 'cost_txt')).toMatchObject({
    fontId: 142,
    size: 10,
    bold: true,
  });
  expect(CREATOR_PALETTE.row.fields.find((f) => f.name === 'name_txt')).toMatchObject({
    x: 18.25,
    size: 8,
  });
  expect(
    CREATOR_PALETTE.stats.fields.find((f) => f.name === 'PrimarySecondary_txt')!.lineHeight,
  ).toBe(12);
  expect(Object.keys(CREATOR_PALETTE.row.codes)).toHaveLength(93);
  expect(
    Object.keys(CREATOR_PALETTE.row.codes)
      .map(Number)
      .sort((a, b) => a - b),
  ).toEqual(PARTS.map((part) => part.id).sort((a, b) => a - b));
});
