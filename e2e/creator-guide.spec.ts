import { expect, test } from '@playwright/test';
import { waitForMainMenu } from './helpers/main-menu';

test.use({ storageState: { cookies: [], origins: [] } });
test(`mock creator guide follows six original pages and latches on entry`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page, { creatorGuide: 'keep' });
  await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'Tank creator guide' }),
    next = guide.getByRole('button', { name: 'Next creator guide page' });
  await expect(guide).toHaveAttribute('data-guide-frame', '2');
  await expect(guide.getByRole('button', { name: 'Previous creator guide page' })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('soaptank.profile.v1')!).creatorHelpSeen,
    ),
  ).toBe(true);
  await page
    .locator('.creator')
    .screenshot({ path: `test-results/mock-creator-guide-welcome.png` });
  // A shape covers the stage and intercepts the underlying controls.
  await expect(page.locator('.creator')).toHaveAttribute('inert', '');
  const tab = await page
    .getByRole('button', { name: 'Weapons', exact: true, includeHidden: true })
    .boundingBox();
  await page.mouse.click(tab!.x + tab!.width / 2, tab!.y + tab!.height / 2);
  await expect(guide).toHaveAttribute('data-guide-frame', '2');
  await next.click();
  await expect(guide).toHaveAttribute('data-guide-frame', '3');
  await guide.getByRole('button', { name: 'Previous creator guide page' }).click();
  await expect(guide).toHaveAttribute('data-guide-frame', '2');
  for (let frame = 3; frame <= 7; frame++) {
    await next.click();
    await expect(guide).toHaveAttribute('data-guide-frame', String(frame));
    await page.locator('.creator').screenshot({
      path: `test-results/mock-creator-guide-${frame}.png`,
    });
  }
  await next.click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page, { creatorGuide: 'keep' });
  await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
  await expect(guide).toHaveCount(0);
  expect(errors).toEqual([]);
});
