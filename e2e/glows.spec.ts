import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'synthetic'} glow filters match byte-image composition and apply tint after filtering`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the original local SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('glows');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-glows'))!);
    expect(proof.variants).toBe(native ? 65 : 0);
    expect(proof.results).toHaveLength(native ? 79 : 13);
    for (const item of proof.results) {
      expect(item.maxDelta, JSON.stringify(item)).toBeLessThanOrEqual(4);
      expect(item.meanDelta, JSON.stringify(item)).toBeLessThan(0.2);
    }
    for (const item of proof.cache)
      expect(
        Math.abs(item.alpha - (item.cached ? 128 : 192)),
        JSON.stringify(item),
      ).toBeLessThanOrEqual(2);
    const hash = await page.locator('#stage canvas').evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      let hash = 2166136261;
      for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
        hash = Math.imul(hash ^ byte, 16777619);
      return hash >>> 0;
    });
    expect(hash).toBe(proof.galleryHash);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'synthetic'}-glows.png` });
    expect(errors).toEqual([]);
  });
