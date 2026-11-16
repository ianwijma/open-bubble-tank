import { expect, test } from '@playwright/test';
test(`mock combat effects preserve fading lines, layer order and paused cleanup`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('combat-effects');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-combat-effects'))!);
  expect(proof.trailSamples.map((s: { age: number; count: number }) => [s.age, s.count])).toEqual([
    [0, 1],
    [12, 1],
    [24, 1],
  ]);
  expect(proof.trailSamples.map((s: { stageAge: number }) => s.stageAge)).toEqual([1, 13, 25]);
  expect(proof.trailSamples[0].alpha).toBeGreaterThan(70);
  expect(proof.trailSamples[0].alpha).toBeLessThan(80);
  expect(proof.trailSamples[1].alpha).toBeGreaterThan(33);
  expect(proof.trailSamples[1].alpha).toBeLessThan(43);
  expect(proof.trailSamples[2].alpha).toBe(0);
  expect(proof.removed).toEqual({ count: 0, ink: 0 });
  expect(proof.retainedProof).toEqual({
    frame: 1,
    stopped: 103,
    nested: 9,
    exactPose: null,
    pureRead: true,
  });
  expect(proof.gallery).toHaveLength(12);
  expect(proof.gallery.every((s: { count: number }) => s.count > 0)).toBe(true);
  expect(proof.hiddenBottom).toBe(proof.coveredHash);
  expect(proof.topHash).not.toBe(proof.coveredHash);
  await page.locator('#stage').screenshot({ path: `test-results/mock-combat-effects.png` });
  expect(errors).toEqual([]);
});
