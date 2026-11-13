import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const original = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/under-avatar-paint-original.json', import.meta.url),
    'utf8',
  ),
) as { points: number[][]; samples: { pixels: number[] }[] };

test('native under-avatar alpha mask preserves finite original paint and rejects red-channel masking', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('under-avatar-paint');
  await page
    .getByLabel('Original SWF')
    .setInputFiles(
      process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf',
    );
  await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse(
    (await page.locator('#status').getAttribute('data-under-avatar-paint'))!,
  );
  writeFileSync(testInfo.outputPath('under-avatar-paint.json'), JSON.stringify(proof, null, 2));
  const differences: unknown[] = [];
  for (const row of [...proof.results, ...proof.game.results] as {
    channel: string;
    i: number;
    pixels: number[][];
  }[]) {
    if (!['alpha', 'game'].includes(row.channel)) continue;
    for (const [j, pixel] of row.pixels.entries()) {
      const expected = original.samples[row.i].pixels[j];
      if (
        expected === 0
          ? pixel[3] > 32
          : pixel[3] < 240 || pixel.slice(0, 3).some((v, k) => Math.abs(v - [187, 217, 242][k]) > 3)
      )
        differences.push({ i: row.i, point: original.points[j], expected, pixel });
    }
  }
  expect(differences).toEqual([]);
  const red = proof.results.find(
    (r: { channel: string; i: number }) => r.channel === 'red' && r.i === 6,
  );
  const alpha = proof.results.find(
    (r: { channel: string; i: number }) => r.channel === 'alpha' && r.i === 6,
  );
  const center = original.points.findIndex(([x, y]) => x === 0 && y === 0);
  expect(alpha.pixels[center][3]).toBe(255);
  expect(red.pixels[center][3]).toBeLessThan(150);
  for (const key of ['stable', 'pure', 'detachedRetained', 'reattachedRetained'])
    expect(proof.game[key], key).toBe(true);
  expect(errors).toEqual([]);
});
