import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
