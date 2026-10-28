import { expect, test } from 'bun:test';
import { PAUSE, PauseMotion } from '../src/game/core/pause-motion';
import { displayPixel, displayAlpha } from '../src/game/core/display-values';
const frames = (motion: PauseMotion, count: number) => {
  for (let i = 0; i < count; i++) motion.advance();
};

test('display property assignment agrees with the project-authored Ruffle numeric probe', () => {
  expect([displayPixel(0.03), displayPixel(-0.03)]).toEqual([0, 0]);
  const motion = new PauseMotion();
  const positions = [];
  for (let i = 0; i < 5; i++) {
    motion.advance();
    positions.push(motion.positions.btn5_mc.x);
  }
  expect(positions).toEqual([619.2, 596.95, 576.95, 558.95, 542.75]);
  motion.phase = 'info';
  frames(motion, 5);
  expect(motion.playAlpha).toBe(0.4921875);
  frames(motion, 5);
  expect(motion.playAlpha).toBe(-0.01171875);
  motion.phase = 'menu';
  frames(motion, 5);
  expect(motion.playAlpha).toBe(0.4765625);
});

test('pause imports the authored button registrations, scale and native symbols', () => {
  expect(PAUSE.pieces.find((p) => p.name === 'btnPlay_mc')).toMatchObject({
    symbol: 1626,
    x: 275,
    y: 232.4,
    scaleX: 4,
  });
  expect(PAUSE.pieces.find((p) => p.name === 'btn3_mc')?.symbol).toBe(1630);
  const motion = new PauseMotion();
  expect(motion.positions.btn3_mc).toEqual({ x: -96.1, y: 285.4 });
  motion.advance();
  expect(motion.positions.btn3_mc.x).toBeCloseTo(-71.1, 8);
  expect(motion.positions.btnSettings_mc.y).toBeCloseTo(495.7, 8);
  expect(motion.positions.btn5_mc.x).toBe(619.2);
  expect(motion.layerAlpha).toBe(0.046875);
});

test('Info shares the current parent alpha, fades the title/play, and retracts the retained buttons', () => {
  const motion = new PauseMotion();
  frames(motion, 3);
  const position = { ...motion.positions.btn3_mc },
    alpha = motion.layerAlpha;
  motion.phase = 'info';
  motion.advance();
  expect(motion.layerAlpha).toBe(alpha);
  expect(motion.positions.btn3_mc.x).toBe(displayPixel(position.x * 0.93 - 96.1 * 0.07));
  frames(motion, 10);
  expect(motion.titleAlpha).toBeLessThanOrEqual(0);
  expect(motion.playAlpha).toBeLessThanOrEqual(0);
  expect(motion.positions.btnPlay_mc).toEqual({ x: 275, y: -72 });
  const retracted = motion.positions.btn5_mc.x;
  motion.phase = 'menu';
  motion.advance();
  expect(motion.positions.btn5_mc.x).toBe(displayPixel(retracted * 0.9 + 397 * 0.1));
  expect(motion.positions.btnPlay_mc.y).toBe(232.4);
  expect(motion.layerAlpha).toBe(displayAlpha(alpha + 0.05));
});

test('hover eases from source base scales and resume waits for reverse preparation', () => {
  const motion = new PauseMotion();
  motion.hovered = 'btnPlay_mc';
  frames(motion, 1);
  expect(motion.scales.btnPlay_mc).toBeCloseTo(4.1, 8);
  motion.hovered = 'btn5_mc';
  motion.advance();
  expect(motion.scales.btn5_mc).toBeCloseTo(1.05, 8);
  frames(motion, 100);
  expect(motion.blurFrame).toBe(39);
  motion.phase = 'closing';
  frames(motion, 40);
  expect(motion.finished).toBe(false);
  expect(motion.layerAlpha).toBeLessThanOrEqual(0);
  motion.advance();
  expect(motion.finished).toBe(true);
});
