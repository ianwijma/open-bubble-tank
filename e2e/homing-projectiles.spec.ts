import { expect, test } from '@playwright/test';
import { displayPixel } from '../src/game/core/display-values';
test(`homing keeps independent movement, delayed aim and close contact`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('homing-projectiles');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-homing-projectiles'))!);
  expect(proof.initialMotion).toEqual({ x: 3, y: 0 });
  expect(proof.frames.map((frame: { angle: number }) => frame.angle)).toEqual([90, 95, 140]);
  expect(
    proof.frames.every(
      (frame: { motion: { x: number; y: number } }) => frame.motion.x === 3 && frame.motion.y === 0,
    ),
  ).toBe(true);
  const first = proof.frames[1],
    radius = proof.radius + 10;
  expect(first.x).toBe(displayPixel(displayPixel(Math.cos((5 * Math.PI) / 180) * radius) + 3));
  expect(first.y).toBe(displayPixel(Math.sin((5 * Math.PI) / 180) * radius));
  expect(proof.acquired.uid).toBe(proof.patient);
  expect(proof.acquired.angle).toBe(145);
  expect(proof.pursuit.angle).toBeCloseTo(
    (Math.atan2(-60 - proof.acquired.y, 100 - proof.acquired.x) * 180) / Math.PI,
  );
  expect(proof.close).toEqual({ paintedContact: false, dead: true, life: 93 });
  expect(proof.panels.every((panel: { ink: number }) => panel.ink > 30)).toBe(true);
  expect(new Set(proof.panels.map((panel: { hash: number }) => panel.hash)).size).toBe(3);
  await page.locator('#stage').screenshot({ path: `test-results/mock-homing-projectiles.png` });
  expect(errors).toEqual([]);
});
