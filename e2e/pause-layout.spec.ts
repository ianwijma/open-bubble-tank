import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
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
test(`mock pause retains authored raster extents, caption geometry and root paint beneath its bitmap`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('pause-flow');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
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
  const shadePaint = async () => {
    const shade = page.locator('.pause-shade');
    const shown = await stage.screenshot();
    await shade.evaluate((node) => ((node as SVGElement).style.visibility = 'hidden'));
    let hidden: Buffer;
    try {
      hidden = await stage.screenshot();
    } finally {
      await shade.evaluate((node) => ((node as SVGElement).style.visibility = ''));
    }
    const colors = await page.evaluate(
      async ({ shown, hidden }) => {
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
          return [...context.getImageData(30, 170, 1, 1).data].slice(0, 3);
        };
        return { shown: await read(shown), hidden: await read(hidden) };
      },
      { shown: [...shown], hidden: [...hidden] },
    );
    const layerAlpha = await page
      .locator('.pause-button-layer')
      .evaluate((node) => Number(node.getAttribute('data-pause-alpha')));
    for (let channel = 0; channel < 3; channel++)
      expect(
        Math.abs(colors.shown[channel] - colors.hidden[channel] * (1 - (64 / 255) * layerAlpha)),
      ).toBeLessThanOrEqual(1);
    return { ...colors, layerAlpha };
  };
  // An opaque initial capture covers the root text; the settled blur reveals it.
  expect(await rootDifference()).toBe(0);
  await page.getByRole('button', { name: 'Advance100 frames', exact: true }).dispatchEvent('click');
  await expect(bitmap).toHaveAttribute('data-saved-frames', '19');
  const rootPixels = await rootDifference();
  expect(rootPixels).toBeGreaterThan(80);
  const settledShade = await shadePaint();
  expect(settledShade.layerAlpha).toBe(1.03125);
  const before = await stage.screenshot();
  await page.getByRole('button', { name: 'PLAY', exact: true }).hover();
  await expect(page.locator('.pause-caption')).toHaveText('Continue Playing');
  await expect(
    page.locator('.pause-caption [alt="Continue Playing"],.pause-caption .mock-lettering'),
  ).toBeVisible();
  await stage.screenshot({ path: testInfo.outputPath('pause-hover.png') });
  let captionBounds: number[] | undefined;
  await page.mouse.move(5, 5);
  await expect(page.locator('.pause-caption [alt="Continue Playing"]')).toHaveCount(0);
  expect(await changedPixels(page, before, await stage.screenshot(), [180, 370, 190, 46])).toBe(0);
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await page.getByRole('button', { name: 'Advance5 frames', exact: true }).dispatchEvent('click');
  const closingShade = await shadePaint();
  expect(closingShade.layerAlpha).toBeLessThan(settledShade.layerAlpha);
  writeFileSync(
    testInfo.outputPath('pause-layout.json'),
    JSON.stringify({ rootPixels, captionBounds, settledShade, closingShade }, null, 2),
  );
  expect(errors).toEqual([]);
});
