import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test(`mock SVG masks retain grouped fill geometry and nested transforms`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('svg-masks');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-svg-masks'))!);
  await page.locator('#stage').screenshot({ path: testInfo.outputPath('svg-masks.png') });
  writeFileSync(testInfo.outputPath('pixels.json'), JSON.stringify(proof, null, 2));
  expect(proof.composed).toEqual({
    visible: [255, 0, 0, 255],
    hole: [0, 0, 0, 0],
    outside: [0, 0, 0, 0],
  });
  for (const [name, pixels] of Object.entries(proof.cases) as [
    string,
    { visible: number[]; outside: number[] },
  ][]) {
    expect(pixels.visible, name).toEqual(name === 'stroke-only' ? [0, 0, 0, 0] : [255, 0, 0, 255]);
    expect(pixels.outside, name).toEqual([0, 0, 0, 0]);
  }
  expect(errors).toEqual([]);
});
