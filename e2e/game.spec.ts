import { waitForMainMenu } from './helpers/main-menu';
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import type { TankDesign } from '../src/game/core/types';
import { dropPreview, saveCreator } from './helpers/creator';
const AVATARS: TankDesign[] = JSON.parse(
  readFileSync(resolve('src/game/data/tanks.json'), 'utf8'),
).avatar_defaults;
const STARTER = AVATARS[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
test('mock path: menu, local enemy creator, settings, exploration and pause', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your game. Original artwork.' })).toBeVisible();
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await page.getByRole('button', { name: 'Place Small Bubble', exact: true }).click();
  await dropPreview(page, 5, -10);
  await page.screenshot({ path: 'test-results/mock-creator.png' });
  await saveCreator(page, 'Test Minnow');
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await expect(page.getByText('Test Minnow', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to main menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('group', { name: 'Sound effects' })
    .getByRole('radio', { name: 'Off', exact: true })
    .check();
  await page.getByRole('radio', { name: '35 FPS' }).check();
  await page.screenshot({ path: 'test-results/mock-settings.png' });
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.locator('.game-canvas').focus();
  await page.screenshot({ path: 'test-results/mock-tutorial.png' });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(4000);
  await page.keyboard.up('KeyD');
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/mock-paused.png' });
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Change map size' }).click();
  await expect(page.getByRole('button', { name: 'Change map size' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('#map-description')).not.toContainText('Position (0, 0)');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.stage-frame').getByRole('alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('SWF path: extract original artwork, compose menu, start original field and read vectors', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'Set BT3_SWF_FILE to test against a local Bubble Tanks 3 SWF.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByLabel('Bubble Tanks 3 Flash file')).toBeEnabled();
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
    timeout: 60000,
  });
  await expect(page.getByRole('img', { name: 'Bubble Tanks 3', exact: true })).toBeVisible();
  await expect(page.locator('.main-menu')).toHaveAttribute('data-title-frame', '179');
  await page.screenshot({ path: 'test-results/swf-menu.png' });
  await page.getByRole('button', { name: 'Credits', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Credits', exact: true })).toBeVisible();
  await page.getByText('About this recreation', { exact: true }).click();
  await expect(page.locator('.asset-summary')).toContainText('1,071 vectors');
  await page.getByText('About this recreation', { exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/swf-tutorial.png' });
  await page.locator('.game-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2300);
  await page.keyboard.up('KeyD');
  const bounds = await page.locator('.game-canvas').boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.75, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  await page.screenshot({ path: 'test-results/swf-battle.png' });
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('invalid SWF is rejected and mock fallback remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Bubble Tanks 3 Flash file')).toBeEnabled();
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles({
    name: 'broken.swf',
    mimeType: 'application/x-shockwave-flash',
    buffer: Buffer.from('invalid file'),
  });
  await expect(page.locator('.stage-frame').getByRole('alert')).toContainText(
    'Choose a Bubble Tanks 3 SWF',
  );
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
test('small viewport keeps the complete stage inside the page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/mobile-gate.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('compressed CWS loads locally and original tank-code sharing survives reload', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const { readFileSync } = await import('node:fs');
  const { deflateSync } = await import('node:zlib');
  const { decompressSWF } = await import('../src/game/assets/swf.mjs');
  const { bytes } = await decompressSWF(new Uint8Array(readFileSync(swf)));
  const header = Buffer.from(bytes.slice(0, 8));
  header[0] = 0x43;
  const compressed = Buffer.concat([header, deflateSync(bytes.slice(8))]);
  await page.goto('/');
  await expect(page.getByLabel('Bubble Tanks 3 Flash file')).toBeEnabled();
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles({
    name: 'Bubble Tanks 3.swf',
    mimeType: 'application/x-shockwave-flash',
    buffer: compressed,
  });
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
    timeout: 60000,
  });
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click();
  await dropPreview(page, 0, 0);
  await page.screenshot({ path: 'test-results/swf-creator.png' });
  await saveCreator(page, 'Code Minnow');
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Tank code' });
  await expect(field).not.toHaveValue('');
  const code = await field.inputValue();
  await page
    .getByRole('dialog', { name: 'Share tank code' })
    .getByRole('button', { name: 'Back', exact: true })
    .click();
  await page.getByRole('button', { name: 'PASTE CODE' }).click();
  await page.getByRole('textbox', { name: 'Tank code' }).fill(code);
  await page
    .getByRole('dialog', { name: 'Import tank code' })
    .getByRole('button', { name: 'IMPORT', exact: true })
    .click();
  await expect(page.getByText('Code Minnow', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await expect(page.getByText('Code Minnow', { exact: true })).toBeVisible();
});

test('saved heavy avatar renders and fires original parts; quality changes apply during play', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const heavy = AVATARS.find((tank) => tank.name === 'The Forsaken')!;
  const profile = {
    version: 1,
    tanks: [],
    achievements: [],
    nextTankId: 10000001,
    settings: { ...DEFAULT_SETTINGS },
    progression: [STARTER, ...Array(6).fill(heavy)],
  };
  await page.addInitScript(
    (profile) => localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile)),
    profile,
  );
  await page.goto('/');
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  await expect(page.locator('.main-menu')).toHaveAttribute('data-title-frame', '179', {
    timeout: 60000,
  });
  await page.getByRole('button', { name: 'Play', exact: true }).click({ timeout: 60000 });
  await page.getByRole('checkbox', { name: 'Use saved avatars from previous game' }).check();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  const canvas = page.locator('.game-canvas canvas');
  await expect(canvas).toBeVisible();
  await page.locator('.game-canvas').focus();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.8, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await page.keyboard.down('Space');
  await page.waitForTimeout(700);
  await page.keyboard.up('Space');
  await page.mouse.up();
  await page.screenshot({ path: 'test-results/swf-heavy.png' });
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('group', { name: 'Quality', exact: true })
    .getByRole('radio', { name: 'Low', exact: true })
    .check();
  await expect(canvas).toHaveAttribute('width', '550');
  await page
    .getByRole('group', { name: 'Quality', exact: true })
    .getByRole('radio', { name: 'High', exact: true })
    .check();
  await expect(canvas).toHaveAttribute('width', '1100');
  await page.screenshot({ path: 'test-results/swf-settings.png' });
  await page.getByRole('button', { name: 'DONE' }).click();
  await page.screenshot({ path: 'test-results/swf-paused.png' });
  expect(errors).toEqual([]);
});
