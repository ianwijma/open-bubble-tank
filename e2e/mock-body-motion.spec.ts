import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dropPreview } from './helpers/creator';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF comparison' : 'mock'} all20 bodies retain source motion and static base variants`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('mock-body-motion');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-mock-body-motion'))!);
    expect(proof.results).toHaveLength(20);
    for (const part of proof.results) {
      expect(
        part.frames.every((f: { timelineEqual: boolean }) => f.timelineEqual),
        String(part.id),
      ).toBe(true);
      for (const frame of part.frames)
        expect(frame.iou, `${part.id} age${frame.age}`).toBeGreaterThan(0.85);
      const hashes = new Set(part.frames.map((f: { hashes: number[] }) => f.hashes[1]));
      if ([1005, 1105, 1205].includes(part.id)) expect(hashes.size).toBe(1);
      else expect(hashes.size, String(part.id)).toBeGreaterThan(1);
    }
    for (const ratios of proof.opacity)
      for (const ratio of ratios) expect(ratio).toBeCloseTo(0.5, 1);
    const png = await page
      .locator('#stage canvas')
      .evaluate((c) => (c as HTMLCanvasElement).toDataURL());
    writeFileSync(
      `test-results/${native ? 'comparison' : 'mock'}-body-motion.png`,
      Buffer.from(png.split(',')[1], 'base64'),
    );
    expect(errors).toEqual([]);
  });

test('mock creator body previews and placed clusters stay animated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByLabel('Symmetric Mode').uncheck();
  const preview = page.locator('.creator-part-preview canvas');
  const hash = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      const c = element as HTMLCanvasElement;
      let h = 2166136261;
      for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
        h = Math.imul(h ^ v, 16777619);
      return h >>> 0;
    });
  for (const name of [
    'Small Bubble',
    'Wiggle Cluster',
    'Air Bladder Cluster',
    'Tentacle Cluster',
    'Smooth Tentacle',
    'Sliding Cluster',
  ]) {
    await page.getByRole('button', { name: `Place ${name}`, exact: true }).click();
    await expect(preview).toBeVisible();
    const first = await hash('.creator-part-preview canvas');
    await expect.poll(() => hash('.creator-part-preview canvas')).not.toBe(first);
    if (name === 'Small Bubble' || name === 'Sliding Cluster')
      await dropPreview(page, name === 'Small Bubble' ? -35 : 25, -10);
  }
  const placed = await hash('.creator-workspace canvas');
  await expect.poll(() => hash('.creator-workspace canvas')).not.toBe(placed);
  await page.screenshot({ path: 'test-results/mock-creator-live-bodies.png' });
});
