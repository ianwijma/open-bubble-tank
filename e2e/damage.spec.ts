import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} body damage hides enemy artwork while attached geometry still hits`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('degradation');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-degradation'))!);
    expect(proof.hidden).toEqual([[], ['body2'], [], []]);
    expect(proof.hits).toEqual([true, true, true, true]);
    expect(proof.hashes[1]).not.toBe(proof.hashes[0]);
    expect(proof.hashes[2]).toBe(proof.hashes[0]);
    expect(proof.hashes[3]).toBe(proof.hashes[0]);
    expect([proof.playerLife, proof.enemyLife]).toEqual([40, 50]);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-body-degradation.png` });
    expect(errors).toEqual([]);
  });
