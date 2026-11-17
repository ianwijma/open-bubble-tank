import { expect, test } from '@playwright/test';
test(`mounted Massive charges animate and share contact geometry`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('mounted-art');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-mounted-art'))!);
  expect(proof).toMatchObject({ firstPlayAge: 2, cloneFrame: 1, age: 0, artAge: 42 });
  expect(proof.panels.map((p: { frames: number[] }) => p.frames)).toEqual([
    [1, 1],
    [9, 1],
    [15, 7],
    [1, 20],
    [1, 27],
    [7, 1],
  ]);
  expect(proof.panels[0].pink).toBe(0);
  expect(proof.panels[4].pink).toBe(0);
  for (const i of [1, 2, 3, 5]) expect(proof.panels[i].pink).toBeGreaterThan(20);
  expect(proof.panels[1].extraContact).toBeGreaterThan(10);
  expect(proof.panels[4].extraContact).toBe(0);
  expect(proof.panels[1].hash).not.toBe(proof.panels[2].hash);
  await page.locator('#stage').screenshot({ path: `test-results/mock-mounted-art.png` });
  expect(errors).toEqual([]);
});
