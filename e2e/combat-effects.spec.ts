import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} combat effects preserve fading lines, layer order and paused cleanup`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('combat-effects');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-combat-effects'))!);
    expect(proof.trailSamples.map((s: { age: number; count: number }) => [s.age, s.count])).toEqual(
      [
        [0, 1],
        [12, 1],
        [24, 1],
      ],
    );
    expect(proof.trailSamples[0].alpha).toBeGreaterThan(70);
    expect(proof.trailSamples[0].alpha).toBeLessThan(80);
    expect(proof.trailSamples[1].alpha).toBeGreaterThan(33);
    expect(proof.trailSamples[1].alpha).toBeLessThan(43);
    expect(proof.trailSamples[2].alpha).toBe(0);
    expect(proof.removed).toEqual({ count: 0, ink: 0 });
    expect(proof.gallery).toHaveLength(12);
    expect(proof.gallery.every((s: { count: number }) => s.count > 0)).toBe(true);
    expect(proof.hiddenBottom).toBe(proof.coveredHash);
    expect(proof.topHash).not.toBe(proof.coveredHash);
    if (native)
      expect(new Set(proof.gallery.map((s: { hash: number }) => s.hash)).size).toBeGreaterThan(9);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-combat-effects.png` });
    expect(errors).toEqual([]);
  });
