import { expect, test } from 'bun:test';
import {
  creatorComplexityLabel,
  creatorClassRequirement,
  creatorDetailText,
  creatorThumbnailScale,
  creatorWeaponIcons,
  creatorWeaponInfoText,
} from '../src/game/core/creator-details';
import { PARTS, partById } from '../src/game/data/catalog';
import type { TankPart } from '../src/game/core/types';
import { CREATOR_PALETTE } from '../src/game/core/creator-palette';
test('rollover labels retain the bytecode complexity branch and precise class wording', () => {
  expect([0, 1, 2, 3, 4, 8].map(creatorComplexityLabel)).toEqual([
    'Low',
    'Low',
    'Low',
    'Medium',
    'Medium',
    'Medium',
  ]);
  expect(creatorClassRequirement({ classCost: 0, lower: false })).toBe('');
  expect(creatorClassRequirement({ classCost: 1, lower: true })).toBe('Must be class 1.');
  expect(creatorClassRequirement({ classCost: 3, lower: true })).toBe('Must be class 3 or lower.');
  expect(creatorClassRequirement({ classCost: 6, lower: false })).toBe('Must be class 6.');
  expect(creatorClassRequirement({ classCost: 2, lower: false })).toBe(
    'Must be class 2 or higher.',
  );
});
test('catalog details retain original damage strings and decode quoted flavor text exactly once', () => {
  expect(PARTS.every((p) => typeof p.damageText === 'string')).toBe(true);
  expect(creatorDetailText(partById(2001)!)).toMatchObject({
    name_txt: 'Basic Cannon',
    gunPoints_txt: '1',
    damage_txt: 'Damage: 1',
  });
  const carrier = PARTS.find((p) => p.name === 'Seeker Carrier')!;
  expect(carrier.flavor).toBe(
    `We've always wondered what sort of dark little secrets were inside of those big yellow bubbles. "Shoot it.  You know you want to." says the Carrier.`,
  );
  expect(
    PARTS.every((p) => ![p.name, p.summary, p.flavor, p.damageText].some((s) => s.includes('\\'))),
  ).toBe(true);
});
test('detail thumbnail shrinks the dominant initial dimension without enlarging small parts', () => {
  expect(creatorThumbnailScale(30, 20)).toBe(1);
  expect(creatorThumbnailScale(48, 10)).toBe(1);
  expect(creatorThumbnailScale(81.65, 81.7)).toBe(48 / 81.7);
  expect(creatorThumbnailScale(100, 20)).toBe(0.48);
  expect(creatorThumbnailScale(0, 0)).toBe(1);
});
test('rollover imports retain fixed registration, seven fields and the independent arrow/thumbnail masks', () => {
  const p = CREATOR_PALETTE.details;
  expect(p.origin).toMatchObject({ tx: 3780, ty: 5060 });
  expect(p.fields).toHaveLength(7);
  expect(p.fields.map((f) => f.name)).toEqual([
    'special_txt',
    'name_txt',
    'gunPoints_txt',
    'bubblePoints_txt',
    'damage_txt',
    'summary_txt',
    'flavor_txt',
  ]);
  expect(p.viewer.mask).toEqual({ x: 5, y: 5.5, width: 49, height: 49 });
  expect(p.viewer.matrix).toMatchObject({ tx: 590, ty: 600 });
  expect(p.arrow.mask).toEqual({ x: 179.5, y: 0.6, width: 42, height: 183.75 });
});

test('selected weapon icons use selection order and the stroked outline corner, excluding bodies', () => {
  const part = (key: string, type: number): TankPart => ({
    key,
    type,
    x: 0,
    y: 0,
    radius: 7,
    rotation: 0,
    scale: 1,
    twin: '',
  });
  const parts = [
    part('body', 1001),
    part('first', 4001),
    part('second', 4001),
    part('behavior', 6003),
  ];
  const boxes = new Map([
    ['body', { x: 0, y: 0, width: 14, height: 14 }],
    ['first', { x: -20.25, y: 3.1, width: 19.5, height: 20 }],
    ['second', { x: 40, y: -35, width: 10, height: 11 }],
    ['behavior', { x: -5, y: -8, width: 18, height: 23 }],
  ]);
  expect(
    creatorWeaponIcons(parts, ['second', 'body', 'first', 'behavior', 'missing'], boxes),
  ).toEqual([
    { key: 'second', type: 4001, x: 50.5, y: -35.5 },
    { key: 'first', type: 4001, x: -0.25, y: 2.6 },
    { key: 'behavior', type: 6003, x: 13.5, y: -8.5 },
  ]);
  expect(
    creatorWeaponIcons(
      parts,
      ['first'],
      new Map([['first', { x: 0.123, y: -2.071, width: 10.002, height: 3 }]]),
    ),
  ).toEqual([{ key: 'first', type: 4001, x: 10.6, y: -2.55 }]);
  expect(creatorWeaponIcons(parts, ['first'], new Map())).toEqual([]);
});
test('selection popup uses numerical Bubble Points independently of the palette complexity label', () => {
  const p = PARTS.find((p) => p.name === 'Seeker Carrier')!;
  expect(creatorWeaponInfoText(p)).toMatchObject({
    name_txt: 'Seeker Carrier',
    gunPoints_txt: '1',
    bubblePoints_txt: '4',
  });
  expect(creatorDetailText(p).bubblePoints_txt).toBe('Medium');
  const layout = CREATOR_PALETTE.selectionInfo;
  expect(layout.icon.bounds).toEqual({ x: 0, y: 0, width: 14.05, height: 15 });
  expect(layout.popup.fields.map((f) => f.name)).toEqual([
    'special_txt',
    'name_txt',
    'gunPoints_txt',
    'bubblePoints_txt',
  ]);
  expect(layout.popup.bounds.width).toBeCloseTo(145, 2);
  expect(layout.popup.bounds.height).toBeCloseTo(62, 2);
});
