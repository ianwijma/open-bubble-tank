import { expect, test } from 'bun:test';
import {
  CREATOR_PALETTE,
  CreatorPaletteScroll,
  creatorWeaponSummary,
  creatorTextLines,
  creatorGlyphLayout,
} from '../src/game/core/creator-palette';
import { AVATARS, partById } from '../src/game/data/catalog';
import type { TankDesign } from '../src/game/core/types';
const design = (ids: number[]): TankDesign => ({
  ...AVATARS[0],
  parts: ids.map((type, i) => ({
    key: String(i),
    type,
    x: 0,
    y: 0,
    radius: 7,
    scale: 1,
    rotation: 0,
    twin: '',
  })),
});
test('creator summary preserves source counts, trailing commas and sorted weapon IDs', () => {
  expect(creatorWeaponSummary(design([]), 2)).toBe('N/A');
  expect(creatorWeaponSummary(design([2001]), 2)).toBe('1 Basic Cannon, ');
  expect(creatorWeaponSummary(design([2002, 2001, 2001]), 2)).toBe(
    `2 ${partById(2001)!.pluralName}, 1 ${partById(2002)!.name}, `,
  );
  expect(creatorWeaponSummary(design([2003, 2001, 2002]), 2)).toBe(
    [2001, 2002, 2003].map((id) => `1 ${partById(id)!.shortName}, `).join(''),
  );
  expect(creatorWeaponSummary(design([5002, 5001]), 5)).toBe(
    [5002, 5001].map((id) => `1 ${partById(id)!.name}, `).join(''),
  );
});
test('palette scroll retains source row overhang and distinct drag/arrow handle spans', () => {
  const m = new CreatorPaletteScroll(26);
  expect(m.extent).toBe(341.5);
  m.step(1);
  expect(m.offset).toBeCloseTo(341.5 / 17);
  expect(m.barY).toBeCloseTo(18 + 120 / 17);
  m.step(100);
  expect(m.barY).toBe(138);
  expect(m.offset).toBe(m.extent);
  m.drag(200);
  expect(m.barY).toBe(138);
  expect(m.offset).toBeCloseTo((m.extent * 120) / 121);
  m.step(-1);
  expect(m.offset).toBeCloseTo((341.5 * 16) / 17);
  m.scrollTo(-1);
  expect(m.offset).toBe(0);
  expect(m.barY).toBe(18);
  m.drag(-1);
  expect(m.offset).toBe(0);
  for (const count of [5, 9]) {
    const small = new CreatorPaletteScroll(count);
    small.step(1);
    expect(small.enabled).toBe(false);
    expect(small.extent).toBe(0);
    expect(small.offset).toBe(0);
  }
});
test('scroll arrows round negative list displacement before adding the row step', () => {
  const scroll = new CreatorPaletteScroll(18);
  scroll.drag(38); // Source extent181.5 and barY38 give exactly30px, halfway through row1.
  expect(scroll.offset).toBe(30);
  scroll.step(1);
  expect(scroll.offset).toBeCloseTo(40.33333333333333);
  scroll.drag(38);
  scroll.step(-1);
  expect(scroll.offset).toBe(0);
});
test('creator wrapping retains blank paragraphs and never splits a weapon word', () => {
  expect(creatorTextLines('Primary Weapons:\n\n\nSecondary Weapons:', 18, (s) => s.length)).toEqual(
    ['Primary Weapons:', '', '', 'Secondary Weapons:'],
  );
  expect(creatorTextLines('1 Basic Cannon, 2 Seekers, ', 16, (s) => s.length)).toEqual([
    '1 Basic Cannon,',
    '2 Seekers, ',
  ]);
  expect(creatorTextLines('Longword abc', 3, (s) => s.length)).toEqual(['Longword', 'abc']);
});

test('mock caption uses source character advances and stays on one line', () => {
  const f = CREATOR_PALETTE.library.caption,
    text = 'Click and Drag Object';
  const { glyphs, width } = creatorGlyphLayout(text, f);
  expect(glyphs).toHaveLength(text.length);
  expect(glyphs[0]).toEqual({ char: 'C', x: 0 });
  expect(glyphs[1].x).toBeCloseTo((CREATOR_PALETTE.fonts[f.fontId].C * f.size) / 1024 + f.spacing);
  expect(width).toBeLessThanOrEqual(f.width - 4);
  expect(creatorTextLines(text, f.width - 4, (t) => creatorGlyphLayout(t, f).width)).toEqual([
    text,
  ]);
});
