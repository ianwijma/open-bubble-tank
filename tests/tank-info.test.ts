import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { displayPixel } from '../src/game/core/display-values';
import {
  infoTextLines,
  infoWeapons,
  tankInfoFields,
  TankInfoMotion,
} from '../src/game/core/tank-info';

const tank = (...ids: number[]) => ({
  ...STARTER,
  parts: ids.map((type, i) => ({ ...STARTER.parts[1], key: String(i), type })),
});

test('tank information sorts and counts categories, abbreviating only lists with three distinct types', () => {
  expect(infoWeapons(STARTER, 2)).toBe('Basic Cannon');
  expect(infoWeapons(STARTER, 3)).toBe('N/A');
  expect(infoWeapons(tank(2001, 2001), 2)).toBe('2 Basic Cannons');
  expect(infoWeapons(tank(2003, 2001, 2001, 2002, 3001, 5001), 2)).toBe("2 BC's, 1 HC, 1 MG");
  expect(infoWeapons(tank(2001, 2002, 2003, 3001, 5001), 3)).toBe('Sticky Burst');
  expect(infoWeapons(tank(5005, 5002, 5001), 5)).toBe('1 R, 1 HR, 1 FF');
});
test('tank information uses source class speed and armor rather than current life or enemy multipliers', () => {
  const fields = tankInfoFields({ ...tank(3001), classId: 4, life: 17, speed: 99 });
  expect([fields.txtClass_txt, fields.txtSpeed_txt, fields.txtArmor_txt]).toEqual([
    '4',
    '0.45',
    '200%',
  ]);
  expect(fields.txtPrimaryWeapons_txt).toBe('N/A');
  expect(fields.txtSecondaryWeapons_txt).toBe('Sticky Burst');
  expect(tankInfoFields({ ...STARTER, classId: 2 }).txtArmor_txt).toBe('110%');
});
test('tank information entrance gates each authored panel and its return moves all labels out', () => {
  const state = new TankInfoMotion(),
    p = state.positions;
  state.advance();
  expect(p.Title_mc.y).toBe(-103.9);
  expect(p.ClassHealth_mc.y).toBe(-119.95);
  expect(p.TankImage_mc.x).toBe(815.45);
  for (let i = 0; i < 30; i++) state.advance();
  expect(p.ClassHealth_mc.y).toBeGreaterThan(10);
  expect(p.TankImage_mc.x).toBeLessThan(815.45);
  expect(p.PrimaryWeapons_mc.x).toBe(-261.45);
  for (let i = 0; i < 170; i++) state.advance();
  expect(p.btnBack_mc.x).toBeCloseTo(59.15, 2);
  expect(p.TankImage_mc.x).toBeCloseTo(359.5, 2);
  state.exiting = true;
  const y = p.Title_mc.y;
  state.advance();
  expect(p.Title_mc.y).toBe(displayPixel(y * 0.93 - 119.95 * 0.07));
  for (let i = 0; i < 100; i++) state.advance();
  expect(state.finished).toBe(true);
});
test('weapon text wraps between words without losing punctuation or splitting abbreviations', () => {
  expect(infoTextLines("2 BC's, 1 HC, 1 MG", 11, (s) => s.length)).toEqual([
    "2 BC's, 1",
    'HC, 1 MG',
  ]);
});
