import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} seeker mines use rectangle contact and animate through paused simulation`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('seeker-mines');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-seeker-mines'))!);
    expect(proof.contact).toEqual({
      rectangleContact: true,
      pixelContacts: [false, false, false],
      mineAlive: false,
      incomingAlive: true,
      effects: [1834, 1723],
    });
    expect(proof.animation.pausedFrame).not.toBe(proof.animation.firstFrame);
    expect(proof.animation).toMatchObject({ endFrame: 55, heldFrame: 55, age: 0, x: 140, y: 20 });
    expect(proof.mineBounds.width).toBeGreaterThan(0);
    expect(proof.mineBounds.height).toBeGreaterThan(0);
    expect(
      proof.galleryInk.every((ink: number) => ink > 0),
      JSON.stringify(proof),
    ).toBe(true);
    if (native) {
      expect(proof.nativeCount).toBe(3);
      expect(proof.blink).toEqual({ frame: 7, ink: 0, emptyBounds: true });
      expect(
        proof.artwork.every((ink: number) => ink > 0),
        JSON.stringify(proof),
      ).toBe(true);
    }
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-seeker-mines.png` });
    expect(errors).toEqual([]);
  });
