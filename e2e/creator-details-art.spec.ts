import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test(`mock creator detail thumbnails shrink once and retain independent preview and clip lifetimes`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-details-art');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  const stage = page.locator('#stage');
  const proof = JSON.parse((await stage.getAttribute('data-creator-details-art'))!);
  writeFileSync(testInfo.outputPath('details-art.json'), JSON.stringify(proof, null, 2));
  const [small, large, animated] = proof.thumbnails;
  for (const row of proof.thumbnails) {
    expect(row.first.ink).toBeGreaterThan(0);
    expect(row.held).toEqual(row.first);
    expect(row.removed.ink).toBe(0);
    expect(row.reset).toEqual(row.first);
  }
  // Small clips are never enlarged; a palette preview retains full size.
  expect(small.first).toEqual(small.preview);
  expect(Math.max(large.preview.width, large.preview.height)).toBeGreaterThan(48);
  expect(Math.max(large.first.width, large.first.height)).toBeLessThanOrEqual(50);
  expect(large.first.width).toBeLessThan(large.preview.width);
  expect(animated.animated.hash).not.toBe(animated.first.hash);
  const initialRatio = animated.first.width / animated.preview.width;
  expect(
    Math.abs(animated.animated.width - animated.previewAnimated.width * initialRatio),
  ).toBeLessThan(3);
  const data = await stage
    .locator('canvas')
    .evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  writeFileSync(
    testInfo.outputPath(`mock-details-art.png`),
    Buffer.from(data.split(',')[1], 'base64'),
  );
  await page.getByLabel('Fixture').selectOption('hotkey-input');
  await expect(stage).not.toHaveAttribute('data-creator-details-art');
  expect(errors).toEqual([]);
});
