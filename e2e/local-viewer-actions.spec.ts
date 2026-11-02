import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} local viewer pages, sorts, deletes, round-trips codes and reports isolated offline search`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [],
      outbound: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (!/^(http:\/\/(localhost|127\.0\.0\.1):|blob:|data:)/.test(request.url()))
        outbound.push(request.url());
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-actions');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage'),
      viewer = stage.locator('.tank-viewer');
    const advance = () =>
      page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await advance();
    await expect(viewer).toHaveAttribute('data-viewer-ready', 'true');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect
      .poll(() =>
        viewer
          .locator('.viewer-card canvas')
          .first()
          .evaluate((node) => {
            const c = node as HTMLCanvasElement;
            return c
              .getContext('2d')!
              .getImageData(0, 0, c.width, c.height)
              .data.some((value, index) => index % 4 === 3 && value > 0);
          }),
      )
      .toBe(true);
    await expect(stage).toHaveAttribute('data-viewer-flow-subscriptions', '4');
    await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(viewer).toContainText('Page: 2 out of:');
    await page.getByRole('button', { name: 'First page', exact: true }).click();
    await page.getByRole('button', { name: 'Sort tanks', exact: true }).focus();
    await advance();
    await page.getByRole('button', { name: 'Sort by name', exact: true }).click();
    await expect(viewer.locator('.viewer-select-tank').first()).toHaveAttribute(
      'aria-label',
      'Load AAA Local Tank',
    );
    await page.getByRole('button', { name: 'Copy code for AAA Local Tank', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Copy code for AAA Local Tank', exact: true }),
    ).toBeDisabled();
    const code = await page.evaluate(() => navigator.clipboard.readText());
    expect(code.length).toBeGreaterThan(40);
    await page.getByRole('button', { name: 'Delete AAA Local Tank', exact: true }).click();
    const remove = page.getByRole('dialog', { name: 'Delete AAA Local Tank?', exact: true });
    await remove.getByRole('button', { name: 'No', exact: true }).click();
    await advance();
    await page.getByRole('button', { name: 'Delete AAA Local Tank', exact: true }).click();
    await remove.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-deleted', 'L10000099');
    await advance();
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    const input = page.getByRole('dialog', { name: 'Enter tank code', exact: true });
    await input.getByRole('textbox', { name: 'Tank code', exact: true }).fill(code);
    await input.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    await expect(viewer.locator('.viewer-select-tank')).toHaveCount(1);
    await advance();
    await page.getByRole('button', { name: 'Save locally AAA Local Tank', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-saved', /.+/);
    await expect(
      page.getByRole('button', { name: 'Save locally AAA Local Tank', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Load AAA Local Tank', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Load AAA Local Tank?', exact: true });
    await confirm.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-selection', /.+/);
    await advance();
    await page.getByRole('button', { name: 'Search for tanks online', exact: true }).click();
    const message = page.getByRole('dialog', { name: 'Tank viewer message', exact: true });
    await expect(message).toContainText('Community tank search is not connected.');
    await message.focus();
    await page.keyboard.press('Escape');
    await advance();
    await stage.screenshot({ path: testInfo.outputPath('local-viewer.png') });
    await page.getByRole('button', { name: 'Return to Tank Creator', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-back', 'true');
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    await expect(viewer).toHaveCount(0);
    await expect(stage).toHaveAttribute('data-viewer-flow-subscriptions', '0');
    expect(errors).toEqual([]);
    expect(outbound).toEqual([]);
  });
  test(`${native ? 'SWF' : 'mock'} viewer guide completes through its two local pages`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-guide');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    const guide = page.getByRole('dialog', { name: 'Tank viewer guide', exact: true });
    await expect(guide).toContainText('Welcome to the Tank Viewer Screen!');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await guide.getByRole('button', { name: 'Next guide page', exact: true }).click();
    await expect(guide).toContainText('Online sharing is offline.');
    await guide.screenshot({ path: testInfo.outputPath('viewer-guide.png') });
    await guide.getByRole('button', { name: 'Previous guide page', exact: true }).click();
    await guide.getByRole('button', { name: 'Next guide page', exact: true }).click();
    await guide.getByRole('button', { name: 'Next guide page', exact: true }).click();
    await expect(guide).toHaveCount(0);
    await expect(page.locator('#stage')).toHaveAttribute('data-viewer-help-complete', 'true');
  });
}
