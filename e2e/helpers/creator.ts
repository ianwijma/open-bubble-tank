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
/** Follow TankScreens' name -> locally saved code -> exit path. */
export async function saveCreator(page: Page) {
  await page.getByRole('button', { name: 'SAVE', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Save your tank', exact: true })
    .getByRole('button', { name: 'Continue', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Tank saved', exact: true })
    .getByRole('button', { name: 'Exit creator', exact: true })
    .click();
}
export async function exitCreator(page: Page) {
  await page.getByRole('button', { name: 'Exit tank creator', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Exit tank creator?', exact: true })
    .getByRole('button', { name: 'Exit without saving', exact: true })
    .click();
}
