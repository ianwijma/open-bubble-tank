import { expect, test } from 'bun:test';
import { AVATARS, ENEMIES, STARTER } from '../src/game/data/catalog';
import {
  localViewerTanks,
  sortViewerTanks,
  viewerSelectionError,
  viewerFit,
  viewerPartSummary,
  viewerWidget,
  TANK_VIEWER,
} from '../src/game/core/tank-viewer';
test('local viewer retains source builtins then custom designs, filters mode and deduplicates source save identity', () => {
  const custom = { ...STARTER, id: 'L1', name: 'Custom' },
    duplicate = { ...AVATARS[0], id: 'different-ID' };
  const renamed = { ...AVATARS[0], name: 'Different name' };
  const avatars = localViewerTanks([custom, duplicate, renamed, ENEMIES[0]], true);
  expect(avatars).toHaveLength(AVATARS.length + 2);
  expect(avatars[0]).toBe(AVATARS[0]);
  expect(avatars.at(-2)).toBe(custom);
  expect(avatars.at(-1)).toBe(renamed);
  expect(localViewerTanks([custom], false)).toEqual([...ENEMIES]);
});
test('source viewer sorting is ascending, case insensitive and stable for ties', () => {
  expect(viewerWidget(1205, 2).frame).toBe(1);
  const tanks = ['zeta', 'alpha', 'ALPHA'].map((name, i) => ({
    ...STARTER,
    id: String(i),
    name,
    author: name,
    classId: 3 - i,
  }));
  expect(sortViewerTanks(tanks, 'name').map((t) => t.id)).toEqual(['1', '2', '0']);
  expect(sortViewerTanks(tanks, 'classId').map((t) => t.id)).toEqual(['2', '1', '0']);
  expect(tanks.map((t) => t.id)).toEqual(['0', '1', '2']);
});
test('viewer enemy selection bypasses avatar locks, while avatar limits and locked parts are distinct', () => {
  const tank = { ...STARTER, classId: 6, parts: [{ ...STARTER.parts[0], type: 3005 }] };
  const limits = { level: 1, maxClass: 1, gunPoints: 0 };
  expect(viewerSelectionError(tank, false, limits)).toBe('');
  expect(viewerSelectionError(tank, true, limits)).toBe(
    'Do not have the parts and exceeds Gun Points, Class',
  );
  expect(
    viewerSelectionError({ ...tank, classId: 1, parts: [{ ...tank.parts[0], type: 5001 }] }, true, {
      ...limits,
      gunPoints: 100,
    }),
  ).toBe('Do not have all the parts for this tank');
});
test('viewer fit includes invisible source helpers at extreme mount positions without using stored radii', () => {
  const tank = { ...STARTER, parts: [{ ...STARTER.parts[0], x: 120, y: 0, radius: 1000 }] };
  expect(viewerFit(tank, [{ x: 110, y: -10, width: 20, height: 20 }], 100, 100)).toBeCloseTo(
    100 / 256.5,
    10,
  );
  expect(viewerFit({ ...tank, parts: [] }, [], 100, 100)).toBe(1);
  expect(viewerPartSummary({ ...STARTER, parts: [STARTER.parts[0], STARTER.parts[0]] })).toBe(
    '2 x Large Bubble\n',
  );
});
test('viewer statistics retain the closed clip mask and its nonlinear ten-frame expansion', () => {
  const s = TANK_VIEWER.statistics;
  expect(s.closed).toEqual(s.frames[0].mask);
  expect(s.frames[0].mask.height).toBeCloseTo(14.65, 5);
  expect(s.frames[1].mask.height).toBeCloseTo(42.95, 5);
  expect(s.frames.at(-1)!.mask.height).toBeCloseTo(149.4, 5);
  expect(viewerWidget(1137, 1).staticDepths).toContain(1);
  expect(viewerWidget(1137, 2).staticDepths).toContain(1);
});
