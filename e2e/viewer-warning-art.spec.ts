import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer caution artwork preserves its hollow triangle and separate dark mark`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-art-components');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const warning = page.locator('[data-viewer-warning]');
    const proof = await warning.evaluate(async (node) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      const raster = node.querySelector('img');
      if (raster) {
        await raster.decode();
        ctx.drawImage(
          raster,
          80 + parseFloat(raster.style.left),
          80 + parseFloat(raster.style.top),
          parseFloat(raster.style.width),
          parseFloat(raster.style.height),
        );
      } else {
        const svg = node.querySelector('svg')!.cloneNode(true) as SVGElement;
        svg.setAttribute('width', '160');
        svg.setAttribute('height', '160');
        svg.setAttribute('viewBox', '-80 -80 160 160');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const image = new Image();
        image.src =
          'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
        await image.decode();
        ctx.drawImage(image, 0, 0);
      }
      const pixel = (x: number, y: number) =>
        Array.from(ctx.getImageData(80 + x, 80 + y, 1, 1).data);
      return {
        outline: pixel(0, -63),
        hole: pixel(25, 10),
        corner: pixel(-55, -50),
        mark: pixel(0, -15),
        dot: pixel(0, 29),
      };
    });
    writeFileSync(testInfo.outputPath('warning-pixels.json'), JSON.stringify(proof, null, 2));
    expect(proof.corner[3]).toBe(0);
    expect(proof.hole[3]).toBe(0);
    expect(proof.outline[3]).toBeGreaterThan(80);
    expect(proof.outline[3]).toBeLessThan(110);
    expect(proof.mark.slice(0, 3)).toEqual([0, 0, 0]);
    expect(proof.mark[3]).toBeGreaterThan(90);
    expect(proof.dot[3]).toBeGreaterThan(90);
    if (!native) await expect(warning.locator('path[fill-rule="evenodd"]')).toHaveCount(1);
    await warning.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-warning.png`,
    });
    expect(errors).toEqual([]);
  });
