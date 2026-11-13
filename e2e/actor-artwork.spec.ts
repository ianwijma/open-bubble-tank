import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';

const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} retained actor mounts keep clock, paint, contact and identity through cache/removal`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('actor-artwork');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-actor-artwork'))!);
    writeFileSync(
      testInfo.outputPath('retained-actor-artwork.json'),
      JSON.stringify(proof, null, 2),
    );
    await page
      .locator('#stage > canvas')
      .screenshot({ path: testInfo.outputPath('retained-actor-artwork.png') });
    for (const key of [
      'cached',
      'restored',
      'removedMount',
      'mountedRetained',
      'stableReads',
      'noRun',
    ])
      expect(proof[key], key).toBe(true);
    expect(proof.panels.map((panel: { artAge: number }) => panel.artAge)).toEqual([
      0, 149, 199, 399, 439, 440,
    ]);
    expect(proof.panels.map((panel: { frames: number[] }) => panel.frames[0])).toEqual([
      1, 2, 3, 7, 47, 48,
    ]);
    expect(proof.rotorFrames).toEqual([1, 1, 1, 1, 1, 1]);
    expect(new Set(proof.childFrames).size).toBeGreaterThan(2); // Finite advancement, not equality to independent original RNG.
    expect(proof.panels.every((panel: { ink: number }) => panel.ink > 50)).toBe(true);
    expect(proof.panels[2].hash).not.toBe(proof.panels[0].hash);
    expect(proof.panels[2].changedContact).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
