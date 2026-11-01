import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

test('SWF enemy control cache retains checkbox, button and confirmation timeline poses', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-enemy-art');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-buttons'))!);
  const evidence = testInfo.outputPath('creator-enemy-rasters.json');
  writeFileSync(evidence, JSON.stringify(proof, null, 2));
  await testInfo.attach('creator-enemy-rasters', {
    path: evidence,
    contentType: 'application/json',
  });
  const row = (key: string) => proof.rows.find((item: { key: string }) => item.key === key)!,
    pose = (frame: number) => row(`enemy:confirm:${frame}`);
  expect(proof.rows).toHaveLength(39);
  expect(proof.rows.every((item: { ink: number }) => item.ink > 0)).toBe(true);
  expect(row('enemy:suggested:1').hash).not.toBe(row('enemy:suggested:2').hash);
  for (const tab of ['tab', 'basic']) {
    expect(row(`enemy:${tab}:up`).hash).not.toBe(row(`enemy:${tab}:over`).hash);
    expect(row(`enemy:${tab}:over`).hash).toBe(row(`enemy:${tab}:down`).hash);
  }
  expect(row('LifeSlider_mc:track').hash).toBe(row('BubblesReturnedSlider_mc:track').hash);
  expect(row('LifeSlider_mc:track').hash).toBe(row('SpeedSlider_mc:track').hash);
  for (const button of ['btnNo', 'btnYes'])
    expect(row(`enemy:confirm:${button}:over`).hash).toBe(row(`enemy:confirm:${button}:down`).hash);
  expect(pose(2).hash).not.toBe(pose(7).hash);
  expect(pose(7).hash).not.toBe(pose(12).hash);
  expect(pose(12).hash).toBe(pose(13).hash);
  expect(pose(12).hash).toBe(pose(14).hash);
  expect(pose(7).buttonPixel).toEqual([255, 255, 255, 77]);
  expect(pose(12).buttonPixel.slice(0, 3)).toEqual([255, 255, 255]);
  // Source913 cuts holes beneath both buttons; retained child frame11 paints alpha153 there.
  expect(pose(12).buttonPixel[3]).toBe(153);
  expect(pose(15).buttonPixel).toEqual([255, 255, 255, 77]);
  for (const button of ['btnNo', 'btnYes'])
    expect(row(`enemy:confirm:without:${button}`).buttonPixel).toEqual([0, 0, 0, 0]);
  expect(pose(17).hash).not.toBe(pose(22).hash);
  expect(pose(2).ink).toBeLessThan(pose(7).ink);
  expect(pose(22).ink).toBeLessThan(pose(17).ink);
  await page
    .locator('#stage')
    .screenshot({ path: testInfo.outputPath('native-enemy-rasters.png') });
  expect(errors).toEqual([]);
});
