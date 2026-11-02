import { waitForMainMenu } from './helpers/main-menu';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readCreatorDesign, dropPreview } from './helpers/creator';
const layouts = JSON.parse(
  readFileSync(resolve('src/game/data/part-geometry.json'), 'utf8'),
) as Record<number, { bounds: { width: number } }>;

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF comparison' : 'mock'} gun and behavior silhouettes preserve catalog layouts and visible contact`, async ({
    page,
  }) => {
    test.skip(
      native && !existsSync(swf),
      'Supply the local research SWF for silhouette comparison.',
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('mock-parts');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-mock-parts'))!);
    await test.info().attach('catalog-silhouette-comparison', {
      body: JSON.stringify(proof),
      contentType: 'application/json',
    });
    expect(proof.samples).toHaveLength(73);
    for (const sample of proof.samples) {
      expect(sample.painted, String(sample.id)).toBeGreaterThan(40);
      expect(sample.contactRatio, String(sample.id)).toBeGreaterThan(0.98);
      expect(sample.mockWidth, String(sample.id)).toBeCloseTo(sample.nativeWidth, 4);
      expect(sample.iou, `${sample.id}: source/mock silhouette overlap`).toBeGreaterThan(0.85);
    }
    const behaviors = proof.samples.filter((s: { id: number }) => s.id >= 6001 && s.id <= 6005);
    expect(behaviors.map((s: { bubbles: number }) => s.bubbles)).toEqual([7, 5, 2, 5, 6]);
    expect(new Set(behaviors.map((s: { hash: number }) => s.hash)).size).toBe(5);
    expect(
      proof.samples.reduce((sum: number, s: { iou: number }) => sum + s.iou, 0) / 73,
    ).toBeGreaterThan(0.94);
    await page
      .locator('#stage canvas')
      .screenshot({ path: `test-results/${native ? 'comparison' : 'mock'}-part-layouts.png` });
    expect(errors).toEqual([]);
  });

test('mock creator previews distinct guns and behaviors and places their authored extents', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByLabel('Symmetric Mode').uncheck();
  // 5 Parallel requires class2. Build a legal hull before checking its placement artwork.
  await page.getByRole('button', { name: 'Place Huge Bubble', exact: true }).click();
  await dropPreview(page, 0, 55);
  const canvas = (await page.locator('.creator-workspace canvas').boundingBox())!;
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + (230 * canvas.height) / 350);
  await page.getByLabel('Part scale').press('End');
  expect((await readCreatorDesign(page)).classId).toBeGreaterThanOrEqual(2);
  const preview = page.locator('.creator-part-preview canvas');
  const hashes: number[] = [];
  for (const [tab, name, id, x] of [
    ['Weapons', '3 Spread', 4004, -35],
    ['Weapons', '5 Parallel', 4006, 35],
    ['Behavior', 'Skittish', 6003, 0],
  ] as const) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page.getByRole('button', { name: `Place ${name}`, exact: true }).click();
    // Selection schedules the preview paint on the next animation frame.
    await expect(
      page.getByRole('button', { name: `Drag ${name} into design`, exact: true }),
    ).toBeVisible();
    await preview.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    hashes.push(
      await preview.evaluate((element) => {
        const c = element as HTMLCanvasElement;
        let hash = 2166136261;
        for (const b of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
          hash = Math.imul(hash ^ b, 16777619);
        return hash >>> 0;
      }),
    );
    await dropPreview(page, x, -30);
    const design = await readCreatorDesign(page);
    expect(design.parts.at(-1)?.type).toBe(id);
    expect(design.parts.at(-1)?.radius).toBeCloseTo(
      (layouts as Record<number, { bounds: { width: number } }>)[id].bounds.width / 2,
      6,
    );
  }
  expect(new Set(hashes).size).toBe(3);
  await page.screenshot({ path: 'test-results/mock-creator-distinct-parts.png' });
});
