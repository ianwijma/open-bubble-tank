import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} menu retains intro countdown, parent fades and31-frame action guard`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('main-menu');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const menu = page.locator('.main-menu'),
      overlay = page.locator('.main-menu-overlay');
    await expect(menu).toHaveAttribute('data-menu-age', '0', { timeout: 60000 });
    const background = page.locator('.main-background canvas');
    const bitmap = () => background.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
    await expect(background).toBeVisible();
    const samples = await background.evaluate((canvas) => {
      const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
      return [0, 449].map((y) => [...ctx.getImageData(0, y, 1, 1).data]);
    });
    const endpoints = [
      [7, 163, 180, 255],
      [6, 61, 96, 255],
    ];
    // Pixel centers lie inside the authored endpoints; browser interpolation rounds channels.
    for (const [i, sample] of samples.entries())
      for (const [c, channel] of sample.entries())
        expect(Math.abs(channel - endpoints[i][c])).toBeLessThanOrEqual(1);
    const initialBackground = await bitmap();
    const advance = async (count: number) => {
      await page.getByRole('button', { name: `Menu advance ${count} frames`, exact: true }).click();
    };
    await expect(menu).toHaveAttribute('data-menu-parked', 'true');
    if (native) await expect(menu).toHaveAttribute('data-title-frame', '1');
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-menu-intro.png` });
    await advance(95);
    expect(await bitmap()).not.toBe(initialBackground);
    await expect(menu).toHaveAttribute('data-menu-parked', 'true');
    expect(Number(await menu.getAttribute('data-control-alpha'))).toBeGreaterThanOrEqual(1);
    await advance(1);
    await expect(menu).toHaveAttribute('data-menu-parked', 'false');
    if (native) {
      // Controls are present before the title splash above them has finished.
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await expect(page.locator('#stage')).toHaveAttribute('data-menu-action-count', '0');
      await advance(100);
    }
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(overlay).toHaveAttribute('disabled', '');
    if (native) {
      const hotkeys = overlay.locator('[aria-label="HotKey Options"]'),
        art = hotkeys.locator('img').first();
      const before = await art.getAttribute('src');
      await hotkeys.hover();
      await expect(art).not.toHaveAttribute('src', before!);
    }
    const scrim = overlay.locator('.modal-scrim');
    await expect(scrim).toHaveCSS('backdrop-filter', 'none');
    await expect(scrim).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    // Source settUp ignores the click while _-EV is true.
    await page.locator('.settings-screen [aria-label="DONE"]').click({ force: true });
    await expect(overlay.locator('.settings-screen')).toBeVisible();
    await advance(20);
    expect(Number(await menu.getAttribute('data-title-alpha'))).toBeLessThan(0.05);
    await advance(5);
    await advance(5);
    await expect(menu).toHaveAttribute('data-menu-busy', 'true');
    await expect(menu).toHaveAttribute('data-menu-parked', 'false');
    await advance(1);
    await expect(menu).toHaveAttribute('data-menu-busy', 'false');
    await expect(menu).toHaveAttribute('data-menu-parked', 'true');
    await expect(overlay).not.toHaveAttribute('disabled', '');
    await expect(overlay.getByRole('dialog')).toBeFocused();
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await advance(1);
    await expect(menu).toHaveAttribute('data-menu-parked', 'false');
    await advance(20);
    await advance(5);
    expect(Number(await menu.getAttribute('data-title-alpha'))).toBeGreaterThanOrEqual(1);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-menu-return.png` });
    await advance(100);
    if (native) await expect(menu).toHaveAttribute('data-title-frame', '179');
    await page.getByRole('button', { name: 'Credits', exact: true }).click();
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(1);
    await expect(menu).toHaveAttribute('data-menu-parked', 'true');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await advance(1);
    await expect(menu).toHaveAttribute('data-menu-parked', 'false');
    if (native) await expect(menu).toHaveAttribute('data-title-frame', '179');
    await advance(20);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(1);
    const efficiency = page.getByRole('group', {
      name: 'Efficiency Mode (Slow Computers)',
      exact: true,
    });
    await efficiency.getByRole('radio', { name: 'On', exact: true }).check();
    const frozenBackground = await bitmap();
    await advance(100);
    expect(await bitmap()).toBe(frozenBackground);
    await efficiency.getByRole('radio', { name: 'Off', exact: true }).check();
    await advance(20);
    expect(await bitmap()).not.toBe(frozenBackground);
    expect(errors).toEqual([]);
  });
}
