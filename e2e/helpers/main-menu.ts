import { expect, type Page } from '@playwright/test';

/** Ordinary navigation waits for the intro; controlled fixtures test its intermediate frames. */
export async function dismissCreatorGuide(page: Page) {
  const guide = page.getByRole('dialog', { name: 'Tank creator guide' });
  for (let count = 0; count < 6 && (await guide.isVisible()); count++)
    await guide.getByRole('button', { name: 'Next creator guide page' }).click();
}
const registered = new WeakSet<Page>();
export async function waitForMainMenu(
  page: Page,
  options: { creatorGuide?: 'keep' | 'dismiss' } = {},
) {
  if (options.creatorGuide !== 'keep' && !registered.has(page)) {
    registered.add(page);
    // Ordinary control flows complete onboarding through its real controls.
    // The dedicated guide tests keep it visible and check every page explicitly.
    await page.addLocatorHandler(page.getByRole('dialog', { name: 'Tank creator guide' }), () =>
      dismissCreatorGuide(page),
    );
  }
  const menu = page.locator('.main-menu');
  await expect(menu).toHaveAttribute('data-menu-parked', 'false', { timeout: 60000 });
  if ((await menu.getAttribute('data-assets')) === 'swf')
    await expect(menu).toHaveAttribute('data-title-frame', '179', { timeout: 60000 });
}
