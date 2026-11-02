import { expect, test, type Page } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
async function changedPixels(page: Page, first: Buffer, second: Buffer, area: number[]) {
  return page.evaluate(
    async ({ first, second, area }) => {
      const read = async (bytes: number[]) => {
        const image = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        image.close();
        return context.getImageData(area[0], area[1], area[2], area[3]).data;
      };
      const a = await read(first),
        b = await read(second);
      let changed = 0;
      for (let i = 0; i < a.length; i += 4)
        if (Math.max(...[0, 1, 2].map((c) => Math.abs(a[i + c] - b[i + c]))) > 2) changed++;
      return changed;
    },
    { first: [...first], second: [...second], area },
  );
}
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} pause retains authored raster extents, caption geometry and root paint beneath its bitmap`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('pause-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage'),
      root = page.locator('.pause-root'),
      bitmap = page.locator('.pause-bitmap');
    await expect(bitmap).toHaveAttribute('data-ready', 'true');
    const rootDifference = async () => {
      const shown = await stage.screenshot();
      await root.evaluate((node) => ((node as SVGElement).style.visibility = 'hidden'));
      try {
        return await changedPixels(page, shown, await stage.screenshot(), [135, 165, 110, 30]);
      } finally {
        await root.evaluate((node) => ((node as SVGElement).style.visibility = ''));
      }
    };
    // An opaque initial capture covers the root text; the settled blur reveals it.
    expect(await rootDifference()).toBe(0);
    await page
      .getByRole('button', { name: 'Advance100 frames', exact: true })
      .dispatchEvent('click');
    await expect(bitmap).toHaveAttribute('data-saved-frames', '19');
    const rootPixels = await rootDifference();
    expect(rootPixels).toBeGreaterThan(80);
    if (native) {
      const rasters = await page.locator('.pause-title img,.pause-orb img').evaluateAll((nodes) =>
        nodes.map((node) => {
          const image = node as HTMLImageElement;
          return {
            prepared: parseFloat(image.style.width),
            displayed: parseFloat(getComputedStyle(image).width),
          };
        }),
      );
      expect(rasters).toHaveLength(5);
      for (const raster of rasters) expect(raster.displayed).toBeCloseTo(raster.prepared, 1);
    }
    const before = await stage.screenshot();
    await page.getByRole('button', { name: 'PLAY', exact: true }).hover();
    if (!native) await expect(page.locator('.pause-caption')).toHaveText('Continue Playing');
    await expect(
      page.locator('.pause-caption [alt="Continue Playing"],.pause-caption .mock-lettering'),
    ).toBeVisible();
    const hovered = await stage.screenshot({ path: testInfo.outputPath('pause-hover.png') });
    let captionBounds: number[] | undefined;
    if (native) {
      captionBounds = await page.evaluate(
        async (bytes) => {
          const image = await createImageBitmap(
            new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
          );
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          image.close();
          const { data } = context.getImageData(180, 370, 190, 46);
          const points: number[][] = [];
          for (let y = 0; y < 46; y++)
            for (let x = 0; x < 190; x++) {
              const i = (y * 190 + x) * 4;
              if (Math.min(data[i], data[i + 1], data[i + 2]) > 200)
                points.push([x + 180, y + 370]);
            }
          return [
            Math.min(...points.map((p) => p[0])),
            Math.min(...points.map((p) => p[1])),
            Math.max(...points.map((p) => p[0])),
            Math.max(...points.map((p) => p[1])),
          ];
        },
        [...hovered],
      );
      // Settled unmodified original capture: [223,392,323,407]. Allow one pixel of raster rounding.
      for (const [i, value] of [223, 392, 323, 407].entries())
        expect(Math.abs(captionBounds[i] - value)).toBeLessThanOrEqual(1);
    }
    await page.mouse.move(5, 5);
    await expect(page.locator('.pause-caption [alt="Continue Playing"]')).toHaveCount(0);
    expect(await changedPixels(page, before, await stage.screenshot(), [180, 370, 190, 46])).toBe(
      0,
    );
    writeFileSync(
      testInfo.outputPath('pause-layout.json'),
      JSON.stringify({ rootPixels, captionBounds }, null, 2),
    );
    expect(errors).toEqual([]);
  });
