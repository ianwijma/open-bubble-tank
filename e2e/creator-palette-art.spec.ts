import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

test('SWF creator palette cache retains authored row states, indicators and control poses', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-palette-art');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-buttons'))!);
  const evidence = testInfo.outputPath('creator-palette-rasters.json');
  writeFileSync(evidence, JSON.stringify(proof, null, 2));
  await testInfo.attach('creator-palette-rasters', {
    path: evidence,
    contentType: 'application/json',
  });
  const row = (key: string) => proof.rows.find((item: { key: string }) => item.key === key)!;
  expect(proof.rows).toHaveLength(45);
  expect(proof.rows.every((item: { ink: number }) => item.ink > 0)).toBe(true);
  const colors = [
    [0, 102, 153],
    [51, 153, 204],
    [199, 102, 5],
    [51, 51, 51],
  ];
  for (const frame of [1, 2, 3, 4]) {
    for (const body of [0, 1])
      for (const code of [1, 3])
        expect(row(`palette:row:${frame}:${body}:${code}`).pixel).toEqual([
          ...colors[frame - 1],
          255,
        ]);
    expect(row(`palette:row:${frame}:0:1`).hash).not.toBe(row(`palette:row:${frame}:0:3`).hash);
    expect(row(`palette:row:${frame}:0:1`).hash).not.toBe(row(`palette:row:${frame}:1:1`).hash);
  }
  for (const tab of [
    'body_mc',
    'primary_mc',
    'secondary_mc',
    'interface_mc',
    'EnemyWeapons_mc',
    'behavior_mc',
  ]) {
    expect(row(`palette:${tab}:1`).hash).not.toBe(row(`palette:${tab}:2`).hash);
    expect(row(`palette:${tab}:2`).hash).toBe(row(`palette:${tab}:3`).hash);
  }
  for (const piece of ['up_mc', 'down_mc', 'bar_mc'])
    expect(row(`palette:${piece}:1`).hash).not.toBe(row(`palette:${piece}:2`).hash);
  await page
    .locator('#stage')
    .screenshot({ path: testInfo.outputPath('native-palette-rasters.png') });
  expect(errors).toEqual([]);
});
