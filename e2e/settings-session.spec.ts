import { expect, test, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function load(page: Page, native: boolean) {
  if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  else await page.getByRole('button', { name: 'Play with mock assets' }).click();
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
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} live FPS, saved preference and menu-instance selection retain their separate source lifetimes`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await load(page, native);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const beforeRateChange = await page.evaluate(() =>
      localStorage.getItem('open-bubble-tank.profile.v1'),
    );
    await page.getByRole('radio', { name: '35 FPS' }).check();
    expect(await page.evaluate(() => localStorage.getItem('open-bubble-tank.profile.v1'))).toBe(
      beforeRateChange,
    );
    await efficiency(page, true).check();
    await stageRate(page, 90, 35);
    await expect(page.getByRole('radio', { name: '65 FPS' })).toBeChecked();
    const saved = () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).settings,
      );
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
    for (const fps of [35, 50, 65])
      await expect(page.getByRole('radio', { name: `${fps} FPS` })).not.toBeChecked();
    await efficiency(page, false).check();
    await stageRate(page, 50, 35);
    await expect(page.getByRole('radio', { name: '50 FPS' })).toBeChecked();
    await page.getByRole('button', { name: 'DONE' }).click();
    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await stageRate(page, 50, 35);
    await expect(page.getByRole('radio', { name: '35 FPS' })).toBeChecked();
    await efficiency(page, true).check();
    await stageRate(page, 90, 35);
    await page
      .getByRole('dialog', { name: 'Settings' })
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-settings-runtime-rate.png` });
    await page.reload();
    await load(page, native);
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
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-settings-restored-rate.png` });
    expect(errors).toEqual([]);
  });
  test(`${native ? 'SWF' : 'mock'} clicking the already-selected source control still performs its action`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    await page.goto('/');
    await load(page, native);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('radio', { name: '35 FPS' }).check();
    await efficiency(page, true).check();
    const fast = page.getByRole('radio', { name: '65 FPS' });
    await expect(fast).toBeChecked();
    await fast.click(); // Source MouseUp runs even though the selector was already highlighted.
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
  });
}
