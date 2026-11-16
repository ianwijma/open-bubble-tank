import { expect, test } from '@playwright/test';
test(`mock aim flags preserve fixed secondaries while Spike uses all seven source contact points`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('aim-contracts');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-aim-contracts'))!);
  expect(proof.angles[0].angle).toBe(-90);
  expect(proof.angles[1].angle).toBe(25);
  expect(proof.angles[2].angle).toBeCloseTo((Math.atan2(-125, -35) * 180) / Math.PI);
  expect(proof.angles[3].angle).toBe(25);
  expect(proof.spike).toEqual({
    first: 77,
    held: 77,
    final: 74,
    successful: [6, 6],
    counter: 0,
    target: null,
  });
  await page.locator('#stage').screenshot({ path: `test-results/mock-aim-contracts.png` });
  expect(errors).toEqual([]);
});
test(`mock ally-health arcs leave the origin and inter-ring connectors transparent`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('tactical-hud');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-tactical-hud'))!);
  expect(proof.connectors).toEqual([0, 0, 0]);
  for (const ring of proof.rings) expect(ring.ink).toBeGreaterThan(100);
  expect(new Set(proof.rings.map((r: { hash: number }) => r.hash)).size).toBe(3);
  expect(proof.cleared).toBe(0);
  await page.locator('#stage').screenshot({ path: `test-results/mock-ally-ring-paths.png` });
  expect(errors).toEqual([]);
});
