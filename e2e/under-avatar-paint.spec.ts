import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const original = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/under-avatar-paint-original.json', import.meta.url),
    'utf8',
  ),
) as {
  points: number[][];
  samples: { mode: string; x: number; y: number; rotation: number; pixels: number[] }[];
};
const masked = original.samples.flatMap((sample, i) => (sample.mode === 'masked' ? [i] : []));

test('native under-avatar alpha mask preserves finite original paint and rejects red-channel masking', async ({
  page,
}, testInfo) => {
  test.skip(!existsSync(swf), 'Supply the original local SWF.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('under-avatar-paint');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse(
    (await page.locator('#status').getAttribute('data-under-avatar-paint'))!,
  );
  writeFileSync(testInfo.outputPath('under-avatar-paint.json'), JSON.stringify(proof, null, 2));
  const differences: unknown[] = [];
  for (const [channel, rows] of [
    ['alpha', proof.results],
    ['red', proof.results],
    ['game', proof.game.results],
  ] as const) {
    const selected = rows.filter((row: { channel: string }) => row.channel === channel);
    expect(selected.map((row: { i: number }) => row.i)).toEqual(masked);
    for (const row of selected) expect(row.pixels).toHaveLength(original.points.length);
  }
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
  for (const key of [
    'stable',
    'pure',
    'detachedRetained',
    'reattachedRetained',
    'obsoleteReleased',
  ])
    expect(proof.game[key], key).toBe(true);
  expect(errors).toEqual([]);
  writeFileSync(
    testInfo.outputPath('native-exterior-paint.png'),
    Buffer.from(proof.game.exteriorPaint.split(',')[1], 'base64'),
  );
  await page.locator('#stage').screenshot({ path: testInfo.outputPath('native-under-avatar.png') });
});

test('mock under-avatar paint follows retained poses and releases obsolete projections', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('under-avatar-paint');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse(
    (await page.locator('#status').getAttribute('data-under-avatar-paint'))!,
  );
  expect(proof.game.results.map((row: { i: number }) => row.i)).toEqual(masked);
  const center = original.points.findIndex(([x, y]) => x === 0 && y === 0);
  for (const [x, expectedAlpha] of [
    [0, 0],
    [475, 255],
  ]) {
    const i = original.samples.findIndex(
      (sample) =>
        sample.mode === 'masked' && sample.x === x && sample.y === 0 && sample.rotation === 0,
    );
    expect(i).toBeGreaterThanOrEqual(0);
    const row = proof.game.results.find((row: { i: number }) => row.i === i);
    expect(row.pixels).toHaveLength(original.points.length);
    expect(row.pixels[center][3]).toBe(expectedAlpha);
    if (expectedAlpha) expect(row.pixels[center].slice(0, 3)).toEqual([187, 217, 242]);
  }
  for (const key of [
    'stable',
    'pure',
    'detachedRetained',
    'reattachedRetained',
    'obsoleteReleased',
  ])
    expect(proof.game[key], key).toBe(true);
  expect(errors).toEqual([]);
  writeFileSync(
    testInfo.outputPath('mock-exterior-paint.png'),
    Buffer.from(proof.game.exteriorPaint.split(',')[1], 'base64'),
  );
  writeFileSync(
    testInfo.outputPath('mock-under-avatar-paint.json'),
    JSON.stringify(proof, null, 2),
  );
  await page.locator('#stage').screenshot({ path: testInfo.outputPath('mock-under-avatar.png') });
});
