import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} SVG masks retain grouped fill geometry and nested transforms`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('svg-masks');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-svg-masks'))!);
    await page.locator('#stage').screenshot({ path: testInfo.outputPath('svg-masks.png') });
    writeFileSync(testInfo.outputPath('pixels.json'), JSON.stringify(proof, null, 2));
    expect(proof.composed).toEqual({
      visible: [255, 0, 0, 255],
      hole: [0, 0, 0, 0],
      outside: [0, 0, 0, 0],
    });
    for (const [name, pixels] of Object.entries(proof.cases) as [
      string,
      { visible: number[]; outside: number[] },
    ][]) {
      expect(pixels.visible, name).toEqual(
        name === 'stroke-only' ? [0, 0, 0, 0] : [255, 0, 0, 255],
      );
      expect(pixels.outside, name).toEqual([0, 0, 0, 0]);
    }
    if (native) {
      //113 nonempty static poses from the raw layout audit, plus10 statistics reveal ages.
      expect(proof.native.cacheCount).toBe(123);
      expect(proof.native.detailBackground[3]).toBeGreaterThan(0);
      expect(proof.native.closedHeader[3]).toBeGreaterThan(0);
      expect(proof.native.closedBody[3]).toBe(0);
      expect(proof.native.openBody[3]).toBeGreaterThan(0);
      expect(proof.native.guideRemote[3]).toBeLessThan(50);
      expect(proof.native.guideLocal[3]).toBe(255);
      expect(proof.native.guideNote[3]).toBe(255);
    }
    expect(errors).toEqual([]);
  });
}
