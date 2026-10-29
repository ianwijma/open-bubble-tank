import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} Credits retains source fade, attribution, hover and offline links`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [],
      remote: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (
        /^https?:/.test(request.url()) &&
        !['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname)
      )
        remote.push(request.url());
    });
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('main-menu');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const menu = page.locator('.main-menu');
    await expect(menu).toHaveAttribute('data-menu-age', '0', { timeout: 60000 });
    const advance = async (count: number) => {
      await page.getByRole('button', { name: `Menu advance ${count} frames`, exact: true }).click();
    };
    await advance(95);
    await advance(1);
    await page.getByRole('button', { name: 'Credits', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Credits', exact: true }),
      pane = dialog.locator('.credits-content');
    await expect(dialog.locator('canvas')).toBeVisible();
    await expect(pane).toHaveAttribute('data-credits-frame', '1');
    await expect(pane).toHaveAttribute('data-credits-alpha', '0');
    await expect(dialog).toContainText('Brian Hall');
    await expect(dialog).toContainText('Jared Riley');
    await advance(5);
    await advance(1);
    await advance(1);
    await advance(1);
    await expect(pane).toHaveAttribute('data-credits-frame', '9');
    await expect(pane).toHaveAttribute('data-credits-alpha', '0.42578125');
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-credits-fade.png` });
    await advance(20);
    await advance(5);
    await expect(pane).toHaveAttribute('data-credits-frame', '34');
    await expect(pane).toHaveAttribute('data-credits-alpha', '1');
    await advance(100);
    await expect(pane).toHaveAttribute('data-credits-frame', '34');
    for (const label of [
      'Hero Interactive website',
      'Polyphone Music website',
      'Hero Interactive on Facebook',
    ]) {
      await dialog.getByRole('button', { name: label, exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('not connected');
    }
    expect(page.context().pages()).toHaveLength(1);
    expect(remote).toEqual([]);
    const before = await page.locator('#stage').screenshot();
    const back = dialog.getByRole('button', { name: 'Back', exact: true });
    await back.hover();
    // Advance the fixture clock while keeping the real pointer over Back.
    await page
      .getByRole('button', { name: 'Menu advance 1 frames', exact: true })
      .evaluate((button) => (button as HTMLButtonElement).click());
    await expect(pane).toHaveAttribute('data-back-frame', '2');
    const after = await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-credits-authored.png` });
    expect(after.equals(before)).toBe(false);
    await back.click();
    await advance(1);
    await expect(dialog).toHaveCount(0);
    await expect(menu).toHaveAttribute('data-menu-parked', 'false');
    expect(errors).toEqual([]);
  });
