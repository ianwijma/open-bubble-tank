import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import {
  UPGRADE_SCREEN,
  upgradeCardMatrix,
  upgradePreviewPlacement,
  upgradePartBounds,
  upgradeWeaponSummary,
  upgradeWidget,
} from '../src/game/core/upgrade-screen';

test('upgrade root imports the original shade, foreground, field metrics and centered card geometry', () => {
  expect(UPGRADE_SCREEN.symbol).toBe(1935);
  expect(UPGRADE_SCREEN.shade.symbol).toBe(1096);
  expect(UPGRADE_SCREEN.foreground.map((p) => p.name)).toEqual(['buildTank_mc', 'text_mc']);
  expect(UPGRADE_SCREEN.viewers.cards.map((p) => p.matrix.tx / 20)).toEqual([-181, 0, 181]);
  expect([0, 1, 2].map((i) => upgradeCardMatrix(i, 3).tx / 20)).toEqual([-181, 0, 181]);
  expect([0, 1].map((i) => upgradeCardMatrix(i, 2).tx / 20)).toEqual([-90.5, 90.5]);
  expect(upgradeCardMatrix(0, 1).tx).toBe(0);
  const fields = upgradeWidget(1916).fields;
  expect(fields.find((f) => f.name === 'tankName_dt')).toMatchObject({
    size: 11,
    width: 114.45,
    wordWrap: false,
  });
  expect(fields.find((f) => f.name === 'primary_dt')).toMatchObject({
    size: 8,
    width: 168.95,
    wordWrap: true,
  });
  expect(UPGRADE_SCREEN.edit).toMatchObject({ symbol: 1098, bounds: { width: 50, height: 17 } });
});

test('source upgrade weapon summaries sort IDs, choose plurals, and keep the unassigned substring trims', () => {
  const tank = {
    ...STARTER,
    parts: [
      { ...STARTER.parts[1], type: 2002 },
      { ...STARTER.parts[1], key: 'second', type: 2001 },
      { ...STARTER.parts[1], key: 'third', type: 2001 },
    ],
  };
  expect(upgradeWeaponSummary(tank, 2)).toBe('2 Basic Cannons, 1 Heavy Cannon, ');
  expect(upgradeWeaponSummary(STARTER, 3)).toBe('N/A');
  tank.parts.push({ ...STARTER.parts[1], key: 'fourth', type: 2003 });
  expect(upgradeWeaponSummary(tank, 2)).toBe("2 BC's, 1 HC's, 1 MG's, ");
});

test('preview fitting never enlarges small tanks and centers asymmetric Script bounds without viewer helpers', () => {
  expect(upgradePreviewPlacement([{ x: 10, y: -10, width: 20, height: 20 }])).toEqual({
    scale: 1,
    x: -20,
    y: 0,
    width: 20,
    height: 20,
  });
  expect(upgradePreviewPlacement([{ x: 0, y: 0, width: 316, height: 40 }])).toEqual({
    scale: 0.5,
    x: -79,
    y: -10,
    width: 158,
    height: 20,
  });
  expect(upgradePreviewPlacement([{ x: -10, y: 10, width: 20, height: 168 }])).toEqual({
    scale: 0.5,
    x: 0,
    y: -47,
    width: 10,
    height: 84,
  });
  expect(upgradePreviewPlacement([])).toEqual({ scale: 1, x: 0, y: 0, width: 0, height: 0 });
  const b = upgradePartBounds(
    { ...STARTER.parts[0], x: 30, y: 10, rotation: 90, scale: 2 },
    { x: -5, y: -10, width: 10, height: 20 },
  );
  expect(b.x).toBeCloseTo(10);
  expect(b.y).toBeCloseTo(0);
  expect(b.width).toBeCloseTo(40);
  expect(b.height).toBeCloseTo(20);
});

test('mock card contours retain the separate preview and weapon panels rather than filling their gap', () => {
  const art = upgradeWidget(1916).art;
  const fills = art.flatMap((p) => p.paths?.filter((path) => path.fill) ?? []);
  expect(fills.length).toBeGreaterThan(0);
  // Compound source shape1907 contains both rounded rectangles, not one large AABB.
  expect(fills[0].d.match(/M/g)!.length).toBe(2);
  expect(upgradeWidget(1916, 2).art[0].fill).toEqual([255, 255, 255, 39]);
});
