import { expect, test } from 'bun:test';
import { MENU_SERIES, MenuSeriesMotion } from '../src/game/core/menu-series';
import { MAIN_MENU, MainMenuMotion } from '../src/game/core/main-menu';
import {
  legacyWebsites,
  SERIES_WEBSITE_URLS,
  ServiceUnavailable,
} from '../src/game/services/extensions';

test('series524 retains source labels, stopped frames, capsule widths and four sequential link births', () => {
  const motion = new MenuSeriesMotion();
  expect(MENU_SERIES.labels).toEqual({ off: 1, toOn: 2, on: 10, toOff: 11 });
  motion.advance(100);
  expect(motion.pose.frame).toBe(1);
  expect(motion.width).toBe(131);
  motion.hover(true);
  expect(motion.pose.frame).toBe(2);
  expect(motion.activeControls).toEqual([]);
  for (const [age, frame, controls] of [
    [102, 4, ['bt_mc']],
    [104, 6, ['bt_mc', 'bt2_mc']],
    [106, 8, ['bt_mc', 'bt2_mc', 'bta_mc']],
    [108, 10, ['bt_mc', 'bt2_mc', 'bta_mc', 'bttd_mc']],
  ] as const) {
    motion.advance(age);
    expect(motion.pose.frame).toBe(frame);
    expect(motion.activeControls).toEqual([...controls]);
  }
  expect(motion.width).toBe(401);
  motion.advance(200);
  expect(motion.pose.frame).toBe(10);
  motion.hover(false);
  expect(motion.pose.frame).toBe(11);
  motion.advance(208);
  expect(motion.pose.frame).toBe(19);
  expect(motion.activeControls).toEqual([]);
  motion.advance(209);
  expect(motion.pose.frame).toBe(1);
});

test('series hover reversal uses21-currentFrame and resets opening children through frame2', () => {
  const motion = new MenuSeriesMotion();
  motion.hover(true);
  motion.advance(5); // frame6
  expect(motion.pose.frame).toBe(6);
  const old = motion.pose.children.get(3)?.clip;
  motion.hover(false);
  expect(motion.pose.frame).toBe(15);
  motion.hover(true);
  expect(motion.pose.frame).toBe(6);
  expect(motion.pose.children.get(3)?.clip).not.toBe(old);
  expect(motion.activeControls).toEqual(['bt_mc', 'bt2_mc']);
  motion.hover(false);
  motion.advance(7); // closing17
  expect(motion.pose.frame).toBe(17);
  motion.hover(true);
  expect(motion.pose.frame).toBe(4);
  expect(motion.activeControls).toEqual(['bt_mc']);
});

test('menu owns the series lifetime through the same intro, fades, parking and return', () => {
  const menu = new MainMenuMotion();
  expect(MAIN_MENU.series.matrix).toMatchObject({ tx: 100, ty: 8400 });
  expect(MAIN_MENU.backgroundClipDepth).toBe(2);
  expect(MAIN_MENU.rollover.font).toMatchObject({
    name: 'Accidental Presidency',
    size: 20,
    letterSpacing: 1,
    color: [255, 255, 255, 165],
  });
  for (let i = 0; i < 96; i++) menu.advance();
  menu.series.hover(true);
  for (let i = 0; i < 8; i++) menu.advance();
  expect(menu.series.pose.frame).toBe(10);
  menu.open();
  for (let i = 0; i < 31; i++) menu.advance();
  expect(menu.parked).toBe(true);
  menu.back();
  expect(menu.series.pose.frame).toBe(10); // parent movement never restarts this child
});

test('series destinations remain disconnected behind the replaceable legacy-websites adapter', () => {
  expect(Object.values(SERIES_WEBSITE_URLS)).toEqual([
    'http://armorgames.com/play/58/bubble-tanks',
    'http://armorgames.com/play/1920/bubble-tanks-2',
    'http://armorgames.com/play/5967/bubble-tanks-arenas',
    'http://armorgames.com/play/6338/bubble-tanks-td-15',
  ]);
  for (const key of Object.keys(SERIES_WEBSITE_URLS) as (keyof typeof SERIES_WEBSITE_URLS)[])
    expect(() => legacyWebsites.open(key)).toThrow(ServiceUnavailable);
});

test('series reversal retains both authored endpoints and every intermediate reveal frame', () => {
  for (const [opening, closing] of [
    [2, 19],
    [3, 18],
    [4, 17],
    [5, 16],
    [6, 15],
    [7, 14],
    [8, 13],
    [9, 12],
  ]) {
    const motion = new MenuSeriesMotion();
    motion.advance(100);
    motion.hover(true);
    motion.advance(100 + opening - 2);
    expect(motion.pose.frame).toBe(opening);
    motion.hover(false);
    expect(motion.pose.frame).toBe(closing);
  }
  for (const [closing, opening] of [
    [11, 10],
    [12, 9],
    [13, 8],
    [14, 7],
    [15, 6],
    [16, 5],
    [17, 4],
    [18, 3],
    [19, 2],
  ]) {
    const motion = new MenuSeriesMotion();
    motion.hover(true);
    motion.advance(100);
    motion.hover(false);
    motion.advance(100 + closing - 11);
    expect(motion.pose.frame).toBe(closing);
    motion.hover(true);
    expect(motion.pose.frame).toBe(opening);
  }
});
