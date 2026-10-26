import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} production viewport releases a paused beam and continues the launcher's wall timer`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('player-clocks');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const read = async () => JSON.parse((await status.getAttribute('data-player-clocks'))!);
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    await page.getByLabel('Stage FPS').selectOption(native ? '35' : '90');
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
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-paused-rocket-timer.png` });
    await page.getByRole('button', { name: 'Resume fixture' }).click();
    await expect.poll(async () => (await read()).trailSegments).toBeGreaterThan(0);
    await stage.focus();
    await page.keyboard.press('KeyP');
    await expect.poll(async () => (await read()).mode).toBe('paused');
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-flying-rocket-trails.png` });
    expect(errors).toEqual([]);
  });
