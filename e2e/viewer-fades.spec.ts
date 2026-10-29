import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer modals retain source frame fades and release dismissed input immediately`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
    const load = page.locator('.viewer-select-tank').first();
    await load.click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toHaveAttribute('data-viewer-alpha', '0');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect(confirm).toHaveAttribute('data-viewer-alpha', '0.2');
    await page.getByRole('button', { name: 'Viewer advance 5 frames', exact: true }).click();
    await expect(confirm).toHaveAttribute('data-viewer-alpha', '1');
    await confirm.getByRole('button', { name: 'No', exact: true }).click();
    const departing = page.locator('.viewer-modal');
    await expect(departing).toHaveAttribute('inert', '');
    await expect(departing.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect(departing).toHaveAttribute('data-viewer-alpha', '0.8');
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await expect(departing).toHaveCount(0);
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    const code = page.getByRole('dialog', { name: 'Enter tank code' }),
      content = page.locator('.viewer-content');
    await expect(code).toHaveAttribute('data-viewer-alpha', '0');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect(code).toHaveAttribute('data-viewer-alpha', '0.2');
    await expect(content).toHaveAttribute('data-viewer-alpha', '0.8');
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await expect(content).toHaveAttribute('data-viewer-alpha', '0');
    await code.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('.viewer-modal')).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect(content).toHaveAttribute('data-viewer-alpha', '0.2');
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await expect(content).toHaveAttribute('data-viewer-alpha', '1');
    await expect(page.locator('.viewer-modal')).toHaveCount(0);
    await page.getByRole('button', { name: 'Search for tanks online', exact: true }).click();
    const message = page.getByRole('dialog', { name: 'Tank viewer message' });
    await expect(message).toHaveAttribute('data-viewer-alpha', '0');
    await page.getByRole('button', { name: 'Viewer advance 1 frames', exact: true }).click();
    await expect(message).toHaveAttribute('data-viewer-alpha', '0.2');
    await message.focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await expect(page.locator('.viewer-modal')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
