import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { dismissCreatorGuide, waitForMainMenu } from './helpers/main-menu';
const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';

test('SWF creator workspace preserves source hairline contrast across all six class frames', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'Supply the local research SWF.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-workspace');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-creator-workspace'))!);
  writeFileSync(testInfo.outputPath('workspace-pixels.json'), JSON.stringify(proof, null, 2));
  expect(proof).toHaveLength(6);
  for (const sample of proof) {
    expect(sample.prepared).toEqual(sample.raw);
    expect(sample.prepared).toEqual({ x: -177, y: -177, width: 354, height: 354 });
    expect(sample.script).toEqual({ x: -175, y: -175, width: 350, height: 350 });
    for (const matrix of sample.placements) {
      expect(matrix.a).toBeGreaterThan(0);
      expect(matrix.a).toBe(matrix.d);
      expect(matrix.b).toBe(0);
      expect(matrix.c).toBe(0);
    }
    // Original guide-off capture: integrated white contrast≈.80 on the axis and≈.10 on the border.
    expect(sample.axis).toBeGreaterThan(0.7);
    expect(sample.axis).toBeLessThan(0.9);
    expect(sample.rawAxis).toBeLessThan(0.06); // Other callers retain the untouched authored SVG.
    expect(sample.border).toBeGreaterThan(0.07);
    expect(sample.border).toBeLessThan(0.14);
    for (const [index, alpha] of (sample.rings as number[]).entries()) {
      if (index >= sample.frame) {
        // The base shapes retain static class outlines even when the named ring is transparent.
        expect(alpha).toBeGreaterThan(0.1);
        expect(alpha).toBeLessThan(0.25);
      } else {
        expect(alpha).toBeGreaterThan(0.2);
        // Frames1–5 also paint a static class-limit outline. Frame6 has only the .25-alpha rings.
        expect(alpha).toBeLessThan(sample.frame === 6 ? 0.31 : 0.6);
      }
    }
  }
  await page
    .locator('[data-workspace-frame="6"]')
    .screenshot({ path: testInfo.outputPath('workspace-class6.png') });
  expect(errors).toEqual([]);
});

test('SWF creator paints the complete workspace border at original game size without intercepting input', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'Supply the local research SWF.');
  await page.goto('/');
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  await waitForMainMenu(page, { creatorGuide: 'keep' });
  await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Tank creator guide' })).toBeVisible();
  await dismissCreatorGuide(page);
  await page.getByRole('button', { name: 'Original game size', exact: true }).click();
  const creator = page.locator('.creator');
  await expect.poll(async () => (await creator.boundingBox())?.width).toBe(550);
  const art = creator.locator('.creator-workspace-rings');
  await expect(art).toBeVisible();
  await expect
    .poll(() =>
      art.evaluate(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  const image = await creator.screenshot({
    path: testInfo.outputPath('creator-original-size.png'),
  });
  const proof = await page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const red = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[0];
    const axisBackground = (red(100, 227) + red(100, 236)) / 2;
    const borderBackground = (red(7, 300) + red(15, 300)) / 2;
    return {
      axis: Array.from(
        { length: 8 },
        (_, i) => (red(100, 228 + i) - axisBackground) / (255 - axisBackground),
      ).reduce((a, b) => a + b, 0),
      border: Array.from(
        { length: 7 },
        (_, i) => (red(8 + i, 300) - borderBackground) / (255 - borderBackground),
      ).reduce((a, b) => a + b, 0),
    };
  }, image.toString('base64'));
  writeFileSync(testInfo.outputPath('creator-contrast.json'), JSON.stringify(proof, null, 2));
  expect(proof.axis).toBeGreaterThan(0.7);
  expect(proof.axis).toBeLessThan(0.9);
  expect(proof.border).toBeGreaterThan(0.07);
  expect(proof.border).toBeLessThan(0.14);
  await creator.locator('.creator-workspace canvas').click({ position: { x: 20, y: 30 } });
  expect(await art.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe('none');
});
