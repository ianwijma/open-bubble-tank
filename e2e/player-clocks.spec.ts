import { expect, test } from '@playwright/test';

test(`mock production viewport releases a paused beam and continues the launcher's wall timer`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('player-clocks');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const read = async () => JSON.parse((await status.getAttribute('data-player-clocks'))!);
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.getByLabel('Stage FPS').selectOption('90');
  const stage = page.locator('.game-canvas');
  await stage.focus();
  const box = await stage.boundingBox();
  await page.mouse.move(box!.x + 400, box!.y + 225);
  await page.mouse.down();
  await expect.poll(async () => (await read()).beams).toBe(1);
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await read()).mode).toBe('paused');
  expect((await read()).beams).toBe(1);
  await page.mouse.up();
  await expect.poll(async () => (await read()).beams).toBe(0);
  await page.getByRole('button', { name: 'Resume fixture' }).click();
  await expect.poll(async () => (await read()).mode).toBe('playing');
  await stage.focus();
  await page.keyboard.down('Space');
  await expect.poll(async () => (await read()).secondary).toBeGreaterThan(0);
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await read()).mode).toBe('paused');
  const paused = await read(),
    pausedFrames = paused.frames;
  await expect.poll(async () => (await read()).rockets, { timeout: 5000 }).toBe(10);
  const final = await read();
  expect(final.frames).toBe(pausedFrames);
  expect(final.rocketAges.slice(paused.rockets).every((age: number) => age === 0)).toBe(true);
  await page.locator('#stage').screenshot({ path: `test-results/mock-paused-rocket-timer.png` });
  await page.getByRole('button', { name: 'Resume fixture' }).click();
  await expect.poll(async () => (await read()).trailSegments).toBeGreaterThan(0);
  await stage.focus();
  await page.keyboard.press('KeyP');
  await expect.poll(async () => (await read()).mode).toBe('paused');
  await page.locator('#stage').screenshot({ path: `test-results/mock-flying-rocket-trails.png` });
  expect(errors).toEqual([]);
});
