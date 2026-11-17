import { expect, test } from '@playwright/test';
test(`mock Phasing paint follows its private fixed-point clock through reset and pause`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('phasing-clock');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-phasing'))!);
  expect(proof.samples.map((s: { counter: number }) => s.counter)).toEqual([
    0, 20, 50, 150, 200, 0,
  ]);
  expect(proof.samples.map((s: { alpha: number }) => s.alpha)).toEqual([
    1,
    136 / 256,
    -1 / 256,
    -1 / 256,
    249 / 256,
    249 / 256,
  ]);
  expect(proof.samples[0].ink).toBeGreaterThan(1000);
  expect(proof.samples[1].ink).toBeGreaterThan(0);
  expect(proof.samples[1].ink).toBeLessThan(proof.samples[0].ink);
  expect(proof.samples[2].ink).toBe(0);
  expect(proof.samples[3].ink).toBe(0);
  expect(proof.samples[4].ink).toBeGreaterThan(proof.samples[1].ink);
  expect(proof.samples[4].ink).toBeLessThan(proof.samples[0].ink);
  expect(proof.samples[5].ink).toBe(proof.samples[4].ink);
  expect(proof.paused).toEqual(proof.before);
  await page.locator('#stage').screenshot({ path: `test-results/mock-phasing-clock.png` });
  expect(errors).toEqual([]);
});
