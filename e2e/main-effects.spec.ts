import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} Main moves canvas and interface together and flashes fade after viewport unmount`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the original local SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('main-effects');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    const background = page.locator('.main-background canvas');
    const bitmap = () => background.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
    const pausedBackground = await bitmap();
    const read = async () => JSON.parse((await status.getAttribute('data-main-effects'))!);
    await page.getByRole('button', { name: 'Shake 12', exact: true }).click();
    await expect
      .poll(async () =>
        (await read()).shakeSamples.some((s: { remaining: number }) => s.remaining === 9),
      )
      .toBe(true);
    await expect.poll(async () => (await read()).remaining).toBe(0);
    const proof = await read();
    const shifted = proof.shakeSamples.find((s: { remaining: number }) => s.remaining === 9);
    expect(shifted.position).toEqual({ x: 3.5, y: 3.5 });
    expect(shifted.main).toEqual(shifted.position);
    expect(shifted.canvas).toEqual(shifted.position);
    expect(shifted.ui).toEqual({ x: 73.5, y: 73.5 });
    expect(proof.main).toEqual({ x: 0, y: 0 });
    expect(proof.gameFrames).toBe(0);
    expect(proof.mode).toBe('paused');
    expect(await bitmap()).toBe(pausedBackground);
    await page.getByRole('button', { name: 'Resume game', exact: true }).click();
    const box = await page.locator('.game-canvas').boundingBox();
    await page.mouse.move(box!.x + 400, box!.y + 150);
    const previousSamples = (await read()).samples.length;
    // Keyboard activation keeps the physical pointer stationary over the game.
    await page.getByRole('button', { name: 'Shake 12', exact: true }).press('Enter');
    await expect.poll(async () => (await read()).samples.length).toBeGreaterThan(previousSamples);
    await expect.poll(async () => (await read()).remaining).toBe(0);
    const aimSamples = (await read()).samples
      .slice(previousSamples)
      .filter((sample: { position: { x: number } }) => sample.position.x !== 0);
    expect(aimSamples.length).toBeGreaterThan(0);
    for (const sample of aimSamples) {
      const expected =
        (Math.atan2(150 - sample.position.y - 225, 400 - sample.position.x - 275) * 180) / Math.PI;
      expect(sample.rotation).toBeCloseTo(expected, 5);
    }
    await page.getByLabel('Effect FPS').selectOption('35');
    await page.getByRole('button', { name: 'Stack flashes', exact: true }).click();
    await expect
      .poll(async () =>
        (await read()).samples.some((s: { alpha: number[] }) => s.alpha.length === 2),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Unmount game', exact: true }).click();
    await expect(page.locator('.game-canvas')).toHaveCount(0);
    await expect.poll(async () => (await read()).alpha.length).toBe(0);
    const flashed = (await read()).samples.filter((s: { alpha: number[] }) => s.alpha.length === 2);
    expect(flashed.length).toBeGreaterThan(0);
    expect(flashed.some((s: { canvas: object | null }) => s.canvas === null)).toBe(true);
    for (const sample of flashed) {
      const alpha = Math.max(0, sample.alpha[0]);
      expect(sample.alpha[1]).toBe(sample.alpha[0]);
      const opacity = 1 - (1 - 0.2 * alpha) * (1 - 0.5 * alpha);
      expect(Math.abs(sample.pixel[3] - opacity * 255)).toBeLessThan(3);
      if (alpha > 0.1) expect(sample.pixel[2]).toBeGreaterThan(sample.pixel[0]);
    }
    expect((await read()).pixel).toEqual([0, 0, 0, 0]);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-main-effects.png` });
    await page.getByLabel('Effect FPS').selectOption('90');
    await page.getByRole('button', { name: 'Shake 12', exact: true }).click();
    await expect
      .poll(async () =>
        (await read()).shakeSamples.some(
          (s: { remaining: number; canvas: object | null }) =>
            s.remaining === 9 && s.canvas === null,
        ),
      )
      .toBe(true);
    await expect.poll(async () => (await read()).remaining).toBe(0);
    expect(errors).toEqual([]);
  });
