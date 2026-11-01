import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

test('SWF creator dialogs cache static art without editable fields or text-only button labels', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-dialog-art');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-buttons'))!);
  writeFileSync(testInfo.outputPath('dialog-cache.json'), JSON.stringify(proof, null, 2));
  expect(proof.rows.map((row: { key: string }) => row.key)).toEqual([
    'dialog:1',
    'dialog:2',
    'dialog:3',
    'dialog:7',
  ]);
  for (const [index, row] of proof.rows.entries()) {
    // Independent raw RECT/MATRIX audit: stage550×450, plus2px raster padding.
    expect(row).toMatchObject({ x: -2, y: -2, width: 554, height: 454 });
    expect(row.ink).toBeGreaterThan(0);
    expect(row.background).toEqual([0, 0, 0, 204]);
    // An unfiltered authored frame includes only additional EditText/button text,
    // which belongs to the independent text layer rather than this static cache.
    expect(row.hash).toBe(proof.whole[index].hash);
  }
  expect(new Set(proof.rows.map((row: { hash: number }) => row.hash)).size).toBe(4);
  expect(proof.rows[0].author).toEqual([0, 0, 0, 204]);
  expect(proof.rows[1].author).toEqual([51, 51, 51, 255]);
  expect(proof.rows[1].tank).toEqual([51, 51, 51, 255]);
  expect(proof.rows[2].code).toEqual([51, 51, 51, 255]);
  expect(proof.rows[3].message).toEqual([0, 0, 0, 204]);
  const data = await page
    .locator('#stage canvas')
    .evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  writeFileSync(
    testInfo.outputPath('native-dialog-art.png'),
    Buffer.from(data.split(',')[1], 'base64'),
  );
  expect(errors).toEqual([]);
});
