import { expect, type Page } from '@playwright/test';

/** Use the production minimap's accessible state instead of a machine-speed travel estimate. */
export async function visitAdjacentFieldAndReturn(page: Page) {
  const map = page.locator('#map-description');
  await page.keyboard.down('KeyD');
  try {
    await expect(map).toContainText('Position (1, 0)', { timeout: 30000 });
  } finally {
    await page.keyboard.up('KeyD');
  }
  await page.keyboard.down('KeyA');
  try {
    await expect(map).toContainText('Position (0, 0)', { timeout: 30000 });
  } finally {
    await page.keyboard.up('KeyA');
  }
}
