import { expect, test } from '@playwright/test';
test(`bullet sizes, warm weapons and homing shoot-down use visible geometry`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('mock-assets');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-mock-assets'))!);
  expect(proof.sizes.slice(0, 3).map((item: { width: number }) => item.width)).toEqual([
    12, 30, 74.25,
  ]);
  expect(proof.intercept).toEqual({
    hit: true,
    seekerRemoved: true,
    shellAlive: true,
    outsideOldRadius: true,
  });
  expect(proof.palette.player.r).toBeGreaterThan(proof.palette.player.b + 80);
  expect(proof.palette.enemy.r).toBeGreaterThan(proof.palette.enemy.b + 80);
  // Editor previews share the untinted gold; hostile live mounts receive the tint.
  expect(Math.abs(proof.palette.player.g - proof.palette.enemy.g)).toBeLessThan(10);
  expect(proof.livePalette.player.g).toBeGreaterThan(proof.livePalette.enemy.g + 8);
  // Body fills are opaque.
  expect(proof.palette.bodyAlpha).toBe(255);
  // Sample blue fill, not its white rim.
  expect(proof.palette.bodyPixel[2]).toBeGreaterThan(proof.palette.bodyPixel[0]);
  expect(proof.panels).toHaveLength(4);
  expect(
    proof.panels.every((p: { ink: number; painted: number }) => p.ink > 100 && p.painted > 100),
    JSON.stringify(proof),
  ).toBe(true);
  const hash = await page.locator('#stage canvas').evaluate(async (element) => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    let hash = 2166136261;
    const canvas = element as HTMLCanvasElement;
    for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
      hash = Math.imul(hash ^ byte, 16777619);
    return hash >>> 0;
  });
  expect(hash).toBe(proof.galleryHash);
  await page.locator('#stage').screenshot({ path: `test-results/mock-mock-assets.png` });
  expect(errors).toEqual([]);
});
