import { expect, type Page } from '@playwright/test';

/** Ordinary navigation waits for the intro; controlled fixtures test its intermediate frames. */
export async function waitForMainMenu(page: Page) {
  const menu = page.locator('.main-menu');
  await expect(menu).toHaveAttribute('data-menu-parked', 'false', { timeout: 60000 });
  if ((await menu.getAttribute('data-assets')) === 'swf')
    await expect(menu).toHaveAttribute('data-title-frame', '179', { timeout: 60000 });
}
