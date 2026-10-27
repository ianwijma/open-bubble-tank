import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} ink loops independently, centers on stage and clears through the effects engine`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('screen-effects');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-screen-effects'))!);
    expect(proof.queued).toBe(true);
    expect(proof.origin).toEqual({ x: 275, y: 225 });
    expect(proof.loop).toEqual({
      age: 219,
      timer: 120,
      pausedTimer: 120,
      retained: true,
      samePixels: true,
    });
    expect(proof.camera.samePixels).toBe(true);
    expect(proof.beforeFront).toBe(false);
    expect(proof.replacement).toMatchObject({ timer: 0, retained: true, samePixels: true });
    expect(proof.crossing).toEqual({ inFront: true, samePixels: true });
    expect(proof.arrival).toEqual({ count: 0, ink: 0 });
    expect(proof.overlap).toEqual({ count: 2, allyTimer: 0 });
    expect(proof.final).toEqual({ retained: true, ink: 0 });
    expect(proof.removed).toEqual({ count: 0, ink: 0 });
    expect(proof.panels).toHaveLength(6);
    expect(
      proof.panels
        .filter((_: unknown, i: number) => i !== 4)
        .every((p: { ink: number }) => p.ink > 1000),
      JSON.stringify(proof),
    ).toBe(true);
    expect(proof.panels[0].hash).not.toBe(proof.panels[3].hash);
    const displayedHash = await page.locator('#stage canvas').evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = element as HTMLCanvasElement;
      let hash = 2166136261;
      for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
        hash = Math.imul(hash ^ byte, 16777619);
      return hash >>> 0;
    });
    expect(displayedHash).toBe(proof.galleryHash);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-screen-effects.png` });
    expect(errors).toEqual([]);
  });
