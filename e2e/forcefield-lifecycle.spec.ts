import { expect, test } from '@playwright/test';
test(`forcefield detaches on crossing and reconstructs after passive Run`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('forcefield-lifecycle');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-forcefield-lifecycle'))!);
  expect(proof.panels.map((p: { attached: boolean }) => p.attached)).toEqual([
    true,
    false,
    false,
    false,
    true,
    true,
  ]);
  expect(proof.panels.map((p: { generation: number }) => p.generation)).toEqual([0, 0, 0, 0, 1, 1]);
  for (const i of [1, 2, 3]) expect(proof.panels[i].ink).toBe(0);
  for (const i of [0, 5]) expect(proof.panels[i].ink).toBeGreaterThan(20);
  expect(proof.fresh).toMatchObject({
    generation: 1,
    origin: 21,
    artAge: 22,
  });
  expect(proof.ready).toBe(true);
  await page.locator('#stage').screenshot({ path: `test-results/mock-forcefield-lifecycle.png` });
  expect(errors).toEqual([]);
});
