import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test(`all31 referenced parts keep their moving timelines`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('mock-part-motion');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
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
  for (const ratios of proof.opacity) for (const ratio of ratios) expect(ratio).toBeCloseTo(0.5, 1);
  await page.locator('#stage canvas').screenshot({ path: `test-results/mock-part-motion.png` });
  const png = await page
    .locator('#stage canvas')
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL('image/png'));
  writeFileSync(`test-results/mock-part-motion-full.png`, Buffer.from(png.split(',')[1], 'base64'));
  expect(errors).toEqual([]);
});
