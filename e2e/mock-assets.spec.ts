import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF comparison' : 'mock'} bullet sizes, warm weapons and homing shoot-down use visible geometry`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF for direct dimensions.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('mock-assets');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-mock-assets'))!);
    for (const item of proof.comparisons) {
      expect(item.mock.width).toBeCloseTo(item.native.width, 5);
      expect(item.mock.height).toBeCloseTo(item.native.height, 5);
    }
    expect(
      proof.comparisons.slice(0, 3).map((item: { mock: { width: number } }) => item.mock.width),
    ).toEqual([12, 30, 74.25]);
    expect(proof.intercept).toEqual(
      Array(2).fill({ hit: true, seekerRemoved: true, shellAlive: true, outsideOldRadius: true }),
    );
    expect(proof.palette.player.r).toBeGreaterThan(proof.palette.player.b + 80);
    expect(proof.palette.enemy.r).toBeGreaterThan(proof.palette.enemy.b + 80);
    // Editor previews share the original gold; hostile live mounts receive the tint.
    expect(Math.abs(proof.palette.player.g - proof.palette.enemy.g)).toBeLessThan(10);
    expect(proof.livePalette.player.g).toBeGreaterThan(proof.livePalette.enemy.g + 8);
    // Recovered body fills are opaque in both supplied and procedural posters.
    expect(proof.palette.bodyAlpha).toBe(255);
    expect(proof.palette.bodyReferenceAlpha).toBe(255);
    for (const pixel of [proof.palette.bodyPixel, proof.palette.referenceBodyPixel])
      expect(pixel[2]).toBeGreaterThan(pixel[0]); // Sample blue fill, not its white rim.
    expect(proof.panels).toHaveLength(8);
    expect(
      proof.panels.every((p: { ink: number; painted: number }) => p.ink > 100 && p.painted > 100),
      JSON.stringify(proof),
    ).toBe(true);
    const hash = await page.locator('#stage canvas').evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      let hash = 2166136261;
      const canvas = element as HTMLCanvasElement;
      for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
        hash = Math.imul(hash ^ byte, 16777619);
      return hash >>> 0;
    });
    expect(hash).toBe(proof.galleryHash);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'comparison' : 'mock'}-mock-assets.png` });
    expect(errors).toEqual([]);
  });
