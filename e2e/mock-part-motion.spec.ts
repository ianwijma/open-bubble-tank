import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dropPreview } from './helpers/creator';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF comparison' : 'mock'} all31 referenced parts retain moving source timelines`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('mock-part-motion');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-mock-part-motion'))!);
    expect(proof.results).toHaveLength(31);
    for (const part of proof.results) {
      expect(
        part.frames.every((f: { timelineEqual: boolean }) => f.timelineEqual),
        String(part.id),
      ).toBe(true);
      for (const frame of part.frames)
        expect(frame.iou, `${part.id} age${frame.age}`).toBeGreaterThan(0.85);
      expect(
        new Set(part.frames.map((f: { hashes: number[] }) => f.hashes[1])).size,
        String(part.id),
      ).toBeGreaterThan(1);
    }
    for (const ratios of proof.opacity)
      for (const ratio of ratios) expect(ratio).toBeCloseTo(0.5, 1);
    await page
      .locator('#stage canvas')
      .screenshot({ path: `test-results/${native ? 'comparison' : 'mock'}-part-motion.png` });
    const png = await page
      .locator('#stage canvas')
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL('image/png'));
    writeFileSync(
      `test-results/${native ? 'comparison' : 'mock'}-part-motion-full.png`,
      Buffer.from(png.split(',')[1], 'base64'),
    );
    expect(errors).toEqual([]);
  });

test('mock creator previews animate Skittish and Phasing before and after placement', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByRole('button', { name: 'Behavior', exact: true }).click();
  await page.getByLabel('Symmetric Mode').uncheck();
  const preview = page.locator('.creator-part-preview canvas');
  for (const name of ['Skittish', 'Phasing']) {
    await page.getByRole('button', { name: `Place ${name}`, exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Drag ${name} into design`, exact: true }),
    ).toBeVisible();
    const hash = async () =>
      preview.evaluate((element) => {
        const c = element as HTMLCanvasElement;
        let h = 2166136261;
        for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
          h = Math.imul(h ^ v, 16777619);
        return h >>> 0;
      });
    const first = await hash();
    await expect.poll(hash, { timeout: 5000 }).not.toBe(first);
    await dropPreview(page, name === 'Skittish' ? -30 : 30, -20);
  }
  const designHash = () =>
    page.locator('.creator-workspace canvas').evaluate((element) => {
      const c = element as HTMLCanvasElement;
      let h = 2166136261;
      for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
        h = Math.imul(h ^ v, 16777619);
      return h >>> 0;
    });
  const placed = await designHash();
  await expect.poll(designHash, { timeout: 5000 }).not.toBe(placed);
  await page.screenshot({ path: 'test-results/mock-creator-live-behaviors.png' });
});
