import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
test.use({
  launchOptions: {
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--js-flags=--stack-size=4096',
    ],
  },
});
test('optional original SWF reference boots locally and advances to its storage tutorial', async ({
  page,
}) => {
  test.skip(
    !process.env.BT3_REFERENCE || !existsSync(swf),
    'Set BT3_REFERENCE=1 and provide the local research SWF.',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3103');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toHaveAttribute('data-ready', 'true');
  const stage = page.locator('ruffle-player');
  // Inspect the captured pixels rather than reading a WebGL buffer after it clears.
  const pixels = async () => {
    const png = await stage.screenshot();
    return page.evaluate(async (bytes) => {
      const image = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
      );
      const c = document.createElement('canvas');
      c.width = image.width;
      c.height = image.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(220, 272, 110, 20).data;
      let bright = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] > 100 && data[i + 1] > 160 && data[i + 2] > 160) bright++;
      return { green: ctx.getImageData(150, 100, 1, 1).data[1], bright };
    }, Array.from(png));
  };
  await expect.poll(async () => (await pixels()).bright, { timeout: 15000 }).toBeGreaterThan(80);
  await stage.screenshot({ path: 'test-results/reference-preloader.png' });
  const box = (await stage.boundingBox())!;
  // Focus the movie before activating its canvas-only Continue control.
  await page.mouse.click(box.x + 10, box.y + 440);
  await page.mouse.click(box.x + 265, box.y + 280);
  await expect.poll(async () => (await pixels()).green, { timeout: 5000 }).toBeLessThan(50);
  await stage.screenshot({ path: 'test-results/reference-storage-tutorial.png' });
  expect(errors).toEqual([]);
});
