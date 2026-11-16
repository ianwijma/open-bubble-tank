import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test(`synthetic creator button rasters keep states, nested transforms and hit-only geometry separate`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-buttons');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-buttons'))!);
  const evidence = testInfo.outputPath('creator-button-rasters.json');
  writeFileSync(evidence, JSON.stringify(proof, null, 2));
  await testInfo.attach('creator-button-rasters', {
    path: evidence,
    contentType: 'application/json',
  });
  const { states, nested } = proof.primitive;
  expect(states.up).toMatchObject({ x: 8, y: 3, width: 14, height: 14 });
  expect(states.up.pixel.slice(0, 3)).toEqual([255, 0, 0]);
  expect(Math.abs(states.up.pixel[3] - 128)).toBeLessThanOrEqual(1);
  expect(states.over.pixel).toEqual([0, 0, 255, 255]);
  expect(states.down.pixel).toEqual([255, 255, 0, 255]);
  expect(states.hit).toMatchObject({
    x: -2,
    y: -2,
    width: 34,
    height: 34,
    pixel: [0, 255, 0, 255],
  });
  expect(nested).toMatchObject({ x: 20, y: 16, width: 24, height: 34 });
  expect(nested.pixel.slice(0, 3)).toEqual([255, 0, 0]);
  expect(Math.abs(nested.pixel[3] - 128)).toBeLessThanOrEqual(1);
  expect(proof.rows).toEqual([]);
  await page.locator('#stage').screenshot({ path: `test-results/synthetic-creator-buttons.png` });
  expect(errors).toEqual([]);
});
