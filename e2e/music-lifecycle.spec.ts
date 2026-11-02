import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu, dismissCreatorGuide } from './helpers/main-menu';
import { exitCreator } from './helpers/creator';
import { watchAudio, musicState } from './helpers/audio';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} music distinguishes new menus from retained settings and creator/viewer visits`, async ({
    page,
  }) => {
    test.setTimeout(native ? 90000 : 60000);
    test.skip(native && !existsSync(swf), 'Supply the local SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await watchAudio(page);
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page, { creatorGuide: 'keep' });
    await expect.poll(async () => (await musicState(page))[0]?.volume).toBe(0.8);
    const first = (await musicState(page))[0];
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('slider', { name: 'Camera zoom' }).fill('75');
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
    expect(await musicState(page)).toHaveLength(1);

    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await dismissCreatorGuide(page);
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
    const guide = page.getByRole('dialog', { name: 'Tank viewer guide', exact: true });
    for (let i = 0; i < 2 && (await guide.isVisible()); i++)
      await guide.getByRole('button', { name: 'Next guide page', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Tank Creator', exact: true }).click();
    expect(await musicState(page)).toHaveLength(1);
    expect((await musicState(page))[0].paused).toBe(false);

    await exitCreator(page);
    await expect(page.locator('.main-menu')).toBeVisible();
    await expect.poll(async () => (await musicState(page)).length).toBe(2);
    await expect.poll(async () => (await musicState(page))[1]?.volume).toBe(0.8);
    const channels = await musicState(page);
    expect(channels[0].paused).toBe(true);
    expect(channels[1].src).toBe(first.src);
    expect(channels[1].paused).toBe(false);
    expect(channels[1].error).toBe(false);
    if (native) {
      await expect
        .poll(async () => (await musicState(page))[1]?.starts.length, { timeout: 35000 })
        .toBeGreaterThan(1);
      const replayed = (await musicState(page))[1];
      expect(replayed.loop).toBe(false);
      expect(replayed.starts[1].volume).toBe(0.8);
      expect(replayed.starts[1].currentTime).toBe(0);
    }
    await page.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-music-menu-return.png`,
    });
    expect(errors).toEqual([]);
  });

test('mock music completes actual media playback and restarts at source volume', async ({
  page,
}) => {
  await watchAudio(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await expect.poll(async () => (await musicState(page))[0]?.duration).toBeGreaterThan(0);
  await expect
    .poll(async () => (await musicState(page))[0]?.starts.length, { timeout: 15000 })
    .toBeGreaterThan(1);
  const music = (await musicState(page))[0];
  expect(music.loop).toBe(false);
  expect(music.starts[1].volume).toBe(0.8);
  expect(music.starts[1].currentTime).toBe(0);
  expect(music.error).toBe(false);
});

test('muted game entry does not replace the menu track remembered by paused Settings', async ({
  page,
}) => {
  await watchAudio(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await expect.poll(async () => (await musicState(page))[0]?.volume).toBe(0.8);
  const menu = (await musicState(page))[0];
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('group', { name: 'Music', exact: true })
    .getByRole('radio', { name: 'Off', exact: true })
    .click();
  await expect.poll(async () => (await musicState(page))[0]?.paused).toBe(true);
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks', exact: true })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.locator('.game-canvas').focus();
  await page.keyboard.press('KeyP');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await musicState(page)).toHaveLength(1);
  await page
    .getByRole('group', { name: 'Music', exact: true })
    .getByRole('radio', { name: 'On', exact: true })
    .click();
  await expect.poll(async () => (await musicState(page)).length).toBe(2);
  const restored = (await musicState(page))[1];
  expect(restored.src).toBe(menu.src);
  expect(restored.volume).toBe(0.8);
  expect(restored.paused).toBe(false);
  await page.getByRole('button', { name: 'DONE', exact: true }).click();
  expect(await musicState(page)).toHaveLength(2);
});
