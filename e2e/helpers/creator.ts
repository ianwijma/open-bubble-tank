import type { Page } from '@playwright/test';
/** Coordinates are relative to the creator's tank registration point. */
export async function dropPreview(page: Page, x: number, y: number) {
  const preview = (await page.locator('.creator-part-preview').boundingBox())!;
  const canvas = (await page.locator('.creator-workspace canvas').boundingBox())!;
  await page.mouse.move(preview.x + preview.width / 2, preview.y + preview.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + ((x + 175) * canvas.width) / 350,
    canvas.y + ((y + 175) * canvas.height) / 350,
    { steps: 12 },
  );
  await page.mouse.up();
}
