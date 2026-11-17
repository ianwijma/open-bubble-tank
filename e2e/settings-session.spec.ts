import { waitForMainMenu } from './helpers/main-menu';
import { expect, test, type Page } from '@playwright/test';
async function load(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click();
  await waitForMainMenu(page);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
    timeout: 60000,
  });
}
const efficiency = (page: Page, on: boolean) =>
  page
    .getByRole('group', { name: 'Efficiency Mode (Slow Computers)', exact: true })
    .getByRole('radio', { name: on ? 'On' : 'Off', exact: true });
const stageRate = async (page: Page, live: number, configured: number) => {
  const layer = page.locator('.settings-layers');
  await expect(layer).toHaveAttribute('data-stage-fps', String(live));
  await expect(layer).toHaveAttribute('data-configured-fps', String(configured));
};
test(`live FPS, saved preference and menu-instance selection keep their separate lifetimes`, async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await load(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const beforeRateChange = await page.evaluate(() => localStorage.getItem('soaptank.profile.v1'));
  await page.getByRole('radio', { name: '35 FPS' }).check();
  expect(await page.evaluate(() => localStorage.getItem('soaptank.profile.v1'))).toBe(
    beforeRateChange,
  );
  await efficiency(page, true).check();
  await stageRate(page, 90, 35);
  const backgroundBitmap = () =>
    page
      .locator('.main-background canvas')
      .evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  const efficientBackground = await backgroundBitmap();
  await expect(page.getByRole('radio', { name: '65 FPS' })).toBeChecked();
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('soaptank.profile.v1')!).settings);
  expect((await saved()).fps).toBe(35);
  expect((await saved()).efficient).toBe(false);
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await stageRate(page, 90, 35);
  await expect(page.getByRole('radio', { name: '65 FPS' })).toBeChecked();
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await stageRate(page, 90, 35);
  await expect(page.getByRole('radio', { name: '35 FPS' })).toBeChecked();
  expect(await backgroundBitmap()).toBe(efficientBackground);
  await efficiency(page, false).check();
  await stageRate(page, 50, 35);
  // Forced efficiency Off resumes particles while the existing pause layer stays mounted.
  await expect.poll(backgroundBitmap).not.toBe(efficientBackground);
  await expect(page.locator('.pause-button-layer')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: '35 FPS' })).toBeChecked();
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await stageRate(page, 50, 35);
  await expect(page.getByRole('radio', { name: '35 FPS' })).toBeChecked();
  await efficiency(page, true).check();
  await stageRate(page, 90, 35);
  await page
    .getByRole('dialog', { name: 'Settings' })
    .screenshot({ path: `test-results/mock-settings-runtime-rate.png` });
  await page.reload();
  await load(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await stageRate(page, 35, 35);
  await expect(page.getByRole('radio', { name: '35 FPS' })).toBeChecked();
  await expect(efficiency(page, false)).toBeChecked();
  for (const label of ['Music', 'Sound effects', 'Screen Shake'])
    await expect(
      page
        .getByRole('group', { name: label, exact: true })
        .getByRole('radio', { name: 'Off', exact: true }),
    ).toBeChecked();
  await expect(
    page
      .getByRole('group', { name: 'Quality', exact: true })
      .getByRole('radio', { name: 'Low', exact: true }),
  ).toBeChecked();
  await page
    .getByRole('dialog', { name: 'Settings' })
    .screenshot({ path: `test-results/mock-settings-restored-rate.png` });
  expect(errors).toEqual([]);
});
test(`clicking the already-selected control still performs its action`, async ({ page }) => {
  await page.goto('/');
  await load(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: '35 FPS' }).check();
  await efficiency(page, true).check();
  const fast = page.getByRole('radio', { name: '65 FPS' });
  await expect(fast).toBeChecked();
  await fast.click(); // MouseUp runs even though the selector was already highlighted.
  await stageRate(page, 65, 65);
  await expect(efficiency(page, true)).toBeChecked();
  await efficiency(page, false).check();
  await stageRate(page, 50, 65);
  await page
    .getByRole('group', { name: 'Quality', exact: true })
    .getByRole('radio', { name: 'Low', exact: true })
    .check();
  await efficiency(page, false).click(); // The Off action resets coupled settings on every click.
  await expect(
    page
      .getByRole('group', { name: 'Quality', exact: true })
      .getByRole('radio', { name: 'High', exact: true }),
  ).toBeChecked();
  await stageRate(page, 50, 65);
  await page.getByRole('radio', { name: '35 FPS' }).focus();
  await page.keyboard.press('ArrowRight');
  await stageRate(page, 50, 50);
});
