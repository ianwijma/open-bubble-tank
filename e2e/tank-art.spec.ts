import { expect, test } from '@playwright/test';
test(`tank art uses independent paused clocks and protection geometry`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('tank-art');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-tank-art'))!);
  expect(proof.live).toEqual({ age: 0, artAge: 12 });
  expect(proof.hit.hitAge).toBe(3);
  expect(proof.forcefield).toMatchObject({
    age: 0,
    artAge: 12,
    frame: 14,
  });
  expect(proof.forcefield.radius).toBe(proof.forcefield.cachedRadius);
  expect(proof.panels).toHaveLength(6);
  expect(
    proof.panels
      .filter((_: unknown, i: number) => i !== 3)
      .every((p: { ink: number; painted: number }) => p.ink > 20 && p.painted > 20),
    JSON.stringify(proof),
  ).toBe(true);
  const displayedHash = await page.locator('#stage canvas').evaluate(async (element) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const canvas = element as HTMLCanvasElement;
    let hash = 2166136261;
    for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
      hash = Math.imul(hash ^ byte, 16777619);
    return hash >>> 0;
  });
  expect(displayedHash).toBe(proof.galleryHash);
  await page.locator('#stage').screenshot({ path: `test-results/mock-tank-art.png` });
  expect(errors).toEqual([]);
});
