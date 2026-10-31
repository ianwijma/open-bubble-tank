import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} menu settings use authored frames and commit unrestricted duplicate hotkeys on Back`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    const efficiency = dialog.getByRole('group', {
      name: 'Efficiency Mode (Slow Computers)',
      exact: true,
    });
    await efficiency.getByRole('radio', { name: 'On', exact: true }).check();
    await expect(efficiency.getByRole('radio', { name: 'On', exact: true })).toBeChecked();
    await expect(dialog.getByRole('radio', { name: '65 FPS' })).toBeChecked();
    await efficiency.getByRole('radio', { name: 'Off', exact: true }).check();
    await expect(efficiency.getByRole('radio', { name: 'Off', exact: true })).toBeChecked();
    await dialog.getByRole('radio', { name: '35 FPS' }).check();
    await expect(dialog.getByRole('radio', { name: '35 FPS' })).toBeChecked();
    await dialog.screenshot({
      path: `test-results/${native ? 'swf' : 'mock'}-menu-settings-authored.png`,
    });
    await dialog.getByRole('button', { name: 'HotKey Options' }).click();
    await expect(dialog.getByRole('button', { name: 'Change target lock key' })).toHaveCount(0);
    const saved = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).settings,
      );
    const up = dialog.getByRole('button', { name: 'Change move up key' });
    await up.click();
    await page.keyboard.press('ShiftRight');
    await expect(up).toHaveAttribute('aria-pressed', 'true');
    expect((await saved()).h1).toBe('KeyW');
    await dialog.getByRole('button', { name: 'Change move down key' }).click();
    await page.keyboard.press('ShiftLeft');
    await dialog.getByRole('button', { name: 'Change pause key' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Change pause key' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.keyboard.press('Semicolon');
    await dialog.screenshot({
      path: `test-results/${native ? 'swf' : 'mock'}-hotkeys-authored.png`,
    });
    await dialog.getByRole('button', { name: 'Back to settings' }).click();
    expect((await saved()).h1).toBe('KeyW');
    await dialog.getByRole('button', { name: 'DONE' }).click();
    const value = await saved();
    expect([value.h1, value.h2, value.h5]).toEqual(['ShiftLeft', 'ShiftLeft', 'Semicolon']);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    await page.locator('.game-canvas').focus();
    await page.keyboard.down('ShiftRight');
    await expect(page.locator('#map-description')).toContainText('Position (0, -1)', {
      timeout: 15000,
    });
    await page.keyboard.up('ShiftRight');
    await page.keyboard.press('Semicolon');
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
    await page.reload();
    expect([...(await saved()).h1]).toEqual([...'ShiftLeft']);
    expect(errors).toEqual([]);
  });
  test(`${native ? 'SWF' : 'mock'} paused settings retain row identities and gate hotkeys on the shared stage`, async ({
    page,
  }) => {
    // CI records 15–19s pointer/presentation waits across these Settings/Info visits.
    // Keep the complete shared-clock and focus proof within one measured budget.
    test.setTimeout(150000);
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('pause-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const advance = (n: number) =>
      page.getByRole('button', { name: `Advance${n} frames`, exact: true }).dispatchEvent('click');
    const y = (selector: string) =>
      page.locator(selector).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f);
    const title = '[data-settings-piece="settings:Title_mc"]',
      rate = '[data-settings-piece="settings:FrameRate_mc"]';
    await advance(100);
    const originalDialog = await page
      .getByRole('dialog', { name: 'Paused', exact: true })
      .elementHandle();
    const node = await page.locator(title).elementHandle();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await advance(1);
    expect(await y(title)).toBe(289.4);
    expect(await y(rate)).toBe(340.45);
    await advance(100);
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    expect(await dialog.evaluate((node, old) => node === old, originalDialog)).toBe(true);
    for (const [selector, depth] of [
      ['[data-settings-page="settings"]', '7'],
      ['.tank-info-screen', '79'],
      ['[data-settings-page="hotkeys"]', '117'],
      ['[data-pause-piece="btnPlay_mc"]', '164'],
      ['[data-pause-piece="btnSettings_mc"]', '167'],
      ['[data-pause-piece="btn3_mc"]', '170'],
      ['[data-pause-piece="btn5_mc"]', '173'],
    ])
      expect(await page.locator(selector).evaluate((node) => getComputedStyle(node).zIndex)).toBe(
        depth,
      );
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pause-settings-authored.png` });
    await dialog.getByRole('button', { name: 'HotKey Options' }).click();
    await advance(1);
    expect(await y('[data-settings-piece="hotkeys:Title_mc"]')).toBe(516.8);
    expect(await y(title)).toBeGreaterThan(-170.05);
    await advance(100);
    await dialog.getByRole('button', { name: 'Back to settings' }).click();
    await advance(100);
    await dialog.getByRole('button', { name: 'DONE' }).click();
    await advance(5);
    expect(await y(title)).toBeGreaterThan(-100);
    expect(await page.locator(title).evaluate((el, old) => el === old, node)).toBe(true);
    await advance(20);
    const settingsExitY = await y(title);
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    await advance(20);
    expect(await y(title)).toBe(settingsExitY);
    await advance(100);
    await page.getByRole('button', { name: 'BACK', exact: true }).click();
    await advance(20);
    const infoTitle = '[data-info-piece="Title_mc"]',
      infoExitY = await y(infoTitle);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await advance(100);
    expect(await y(infoTitle)).toBe(infoExitY);
    await dialog.focus();
    await page.keyboard.press('KeyP');
    await advance(5);
    const layerAlpha = await page
      .locator('.pause-button-layer')
      .evaluate((node) => getComputedStyle(node).opacity);
    expect(Number(layerAlpha)).toBeGreaterThan(0);
    expect(Number(layerAlpha)).toBeLessThan(1);
    expect(
      await page
        .locator('.settings-layers')
        .evaluate((node) => node.parentElement?.classList.contains('pause-button-layer')),
    ).toBe(true);
    await advance(100);
    await expect(page.locator('#stage')).toHaveAttribute('data-world-mode', 'playing');
    expect(errors).toEqual([]);
  });
}
