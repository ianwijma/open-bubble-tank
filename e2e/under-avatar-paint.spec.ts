import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const fixture = JSON.parse(
  readFileSync(new URL('../tests/fixtures/under-avatar-paint.json', import.meta.url), 'utf8'),
) as {
  points: number[][];
  samples: { mode: string; x: number; y: number; rotation: number; pixels: number[] }[];
};
const masked = fixture.samples.flatMap((sample, i) => (sample.mode === 'masked' ? [i] : []));

test('under-avatar paint follows retained poses and releases obsolete projections', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('under-avatar-paint');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse(
    (await page.locator('#status').getAttribute('data-under-avatar-paint'))!,
  );
  expect(proof.game.results.map((row: { i: number }) => row.i)).toEqual(masked);
  const center = fixture.points.findIndex(([x, y]) => x === 0 && y === 0);
  for (const [x, expectedAlpha] of [
    [0, 0],
    [475, 255],
  ]) {
    const i = fixture.samples.findIndex(
      (sample) =>
        sample.mode === 'masked' && sample.x === x && sample.y === 0 && sample.rotation === 0,
    );
    expect(i).toBeGreaterThanOrEqual(0);
    const row = proof.game.results.find((row: { i: number }) => row.i === i);
    expect(row.pixels).toHaveLength(fixture.points.length);
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
