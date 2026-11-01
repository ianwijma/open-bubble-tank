import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} selected creator preview keeps source registration and clips full-size artwork`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    const creator = page.locator('.creator'),
      preview = page.locator('.creator-part-preview'),
      canvas = preview.locator('canvas'),
      caption = page.locator('.creator-palette-caption > .creator-text-field');
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await expect
      .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())?.width)
      .toBe(350);
    const stage = (await creator.boundingBox())!,
      bounds = (await preview.boundingBox())!,
      scale = stage.width / 550;
    expect((bounds.x - stage.x) / scale).toBeCloseTo(398, 1);
    expect((bounds.y - stage.y) / scale).toBeCloseTo(179.05, 1);
    expect(bounds.width / scale).toBeCloseTo(141, 1);
    expect(bounds.height / scale).toBeCloseTo(67, 1);
    await expect(canvas).toHaveAttribute('width', '282');
    await expect(canvas).toHaveAttribute('height', '134');
    await expect(preview).toHaveCSS('border-width', '0px');
    await expect(preview).toHaveCSS('overflow', 'hidden');
    await expect(caption).toHaveCSS('left', '19.7px');
    await expect(caption).toHaveCSS('top', '60.15px');
    await expect(caption).toHaveCSS('opacity', '0.6');
    await expect(caption).toMatchAriaSnapshot('- text: Click and Drag Object');
    await expect(preview.locator('span')).toHaveCount(0);
    if (native) await expect(page.locator('.creator-palette-backdrop > img')).toHaveCount(1);
    else await expect(page.locator('.creator-mock-preview-border')).toHaveCount(1);
    // Require live poses before sampling a large part; a temporary static loading fallback
    // must not satisfy the full-size check before the retained scene initializes.
    await page.getByRole('button', { name: 'Place Medium Bubble', exact: true }).click();
    const signature = () =>
      canvas.evaluate((element) => {
        const c = element as HTMLCanvasElement;
        let hash = 2166136261;
        for (const value of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
          hash = Math.imul(hash ^ value, 16777619);
        return hash >>> 0;
      });
    const first = await signature();
    await expect.poll(signature).not.toBe(first);
    const second = await signature();
    await expect.poll(signature).not.toBe(second);
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await page.getByRole('button', { name: 'Place Seeker Carrier', exact: true }).click();
    await expect(preview).toHaveAccessibleName('Drag Seeker Carrier into design');
    // A48px fit cannot paint >70px wide or reach both edges of the67px-high mask.
    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          const c = element as HTMLCanvasElement,
            pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
          let min = c.width,
            max = 0,
            top = 0,
            bottom = 0;
          for (let y = 0; y < c.height; y++)
            for (let x = 0; x < c.width; x++)
              if (pixels[(y * c.width + x) * 4 + 3] > 100) {
                min = Math.min(min, x);
                max = Math.max(max, x);
                if (y < 2) top++;
                if (y > c.height - 3) bottom++;
              }
          return max - min > 140 && top > 15 && bottom > 15;
        }),
      )
      .toBe(true);
    await creator.screenshot({ path: testInfo.outputPath('full-size-preview.png') });
    await page.getByRole('button', { name: 'Body', exact: true }).click();
    await expect(preview).not.toHaveAccessibleName('Drag Seeker Carrier into design');
    await expect(caption.locator(':scope > .sr-only')).toHaveText('Click and Drag Object');
    expect(errors).toEqual([]);
  });
