import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} orbital launch uses live Script width and shared retained status poses`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('orbital-width');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-orbital-width'))!);
    expect(Math.abs(proof.initial.width - proof.radius * 2)).toBeGreaterThan(1);
    expect(proof.shield.width).toBeGreaterThan(proof.initial.width);
    for (const launch of [proof.initial, proof.shield])
      expect(Math.abs(launch.distance - (launch.width / 2 + 10))).toBeLessThan(0.075);
    expect(proof.first.rootFrame).toBe(3);
    expect(proof.later.rootFrame).toBe(3);
    expect(proof.first.childAge).toBe(1);
    expect(proof.later.childAge).toBe(11);
    expect(proof.later.childFrame).not.toBe(proof.first.childFrame);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-orbital-width.png` });
    expect(errors).toEqual([]);
  });
