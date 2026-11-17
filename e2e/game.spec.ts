import { waitForMainMenu } from './helpers/main-menu';
import { test, expect } from '@playwright/test';
import { dropPreview, saveCreator } from './helpers/creator';
test('mock path: menu, local enemy creator, settings, exploration and pause', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Build a tank out of bubbles.' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByRole('button', { name: 'Place Small Bubble', exact: true }).click();
  await dropPreview(page, 5, -10);
  await page.screenshot({ path: 'test-results/mock-creator.png' });
  await saveCreator(page, { name: 'Test Minnow' });
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await expect(page.getByText('Test Minnow', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to main menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('group', { name: 'Sound effects' })
    .getByRole('radio', { name: 'Off', exact: true })
    .check();
  await page.getByRole('radio', { name: '35 FPS' }).check();
  await page.screenshot({ path: 'test-results/mock-settings.png' });
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.locator('.game-canvas').focus();
  await page.screenshot({ path: 'test-results/mock-tutorial.png' });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyD');
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/mock-paused.png' });
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Change map size' }).click();
  await expect(page.getByRole('button', { name: 'Change map size' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('#map-description')).not.toContainText('Position (0, 0)');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.stage-frame').getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('mock small viewport keeps the complete stage inside the page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/mobile-gate.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
