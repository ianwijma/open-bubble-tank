import { expect, test } from '@playwright/test';
test(`effects follow actual parents and retain same-ID objects across reparent`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('effect-ownership');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-effect-ownership'))!);
  await testInfo.attach('physical-effect-proof', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
  expect(proof.actualParent.count).toBe(1);
  expect(proof.actualParent.position).toEqual({ x: 195, y: 225 });
  expect(proof.actualParent.changedPixels).toBeGreaterThan(5);
  expect(proof.duplicateIds).toEqual({ bottom: 1, top: 1, distinct: true });
  expect(proof.reparent).toEqual({
    bottom: 0,
    top: 2,
    retained: true,
    order: true,
    positions: [
      { x: 355, y: 225 },
      { x: 195, y: 225 },
    ],
  });
  expect(errors).toEqual([]);
  await page.locator('#stage').screenshot({ path: testInfo.outputPath('physical-effects.png') });
});
