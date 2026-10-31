import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function watchAudio(page: Page) {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const audio: HTMLAudioElement[] = [];
    Object.defineProperty(window, '__testAudio', { value: audio });
    window.Audio = new Proxy(NativeAudio, {
      construct(target, args) {
        const element = new target(args[0]);
        audio.push(element);
        return element;
      },
    });
  });
}
async function play(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
}
async function musicPlaying(page: Page) {
  return page.evaluate(() => {
    const list = (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio;
    const music = list.filter((audio) => audio.loop).at(-1);
    return !!music && !music.paused && music.currentTime > 0 && !music.error;
  });
}
test('mock sound, gesture resume, P/Escape, zoom, guide and centered creator button', async ({
  page,
}) => {
  await watchAudio(page);
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'Bubble Tanks 3 on Internet Archive' }),
  ).toHaveAttribute('href', 'https://archive.org/details/bubble-tanks-3');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await expect(page.locator('.main-menu')).toHaveAttribute('data-menu-parked', 'false');
  const create = page.getByRole('button', { name: 'Enemy tank creator' });
  const box = await create.boundingBox(),
    icon = await create.locator('svg').boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - icon!.x - icon!.width / 2)).toBeLessThan(1);
  expect(Math.abs(box!.y + box!.height / 2 - icon!.y - icon!.height / 2)).toBeLessThan(1);
  const playBox = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
  const libraryBox = await page
    .getByRole('button', { name: 'My tanks', exact: true })
    .boundingBox();
  expect(box!.x).toBeGreaterThan(playBox!.x + playBox!.width);
  expect(libraryBox!.x + libraryBox!.width).toBeLessThan(playBox!.x);
  await page.screenshot({ path: 'test-results/mock-menu.png' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('slider', { name: 'Camera zoom' }).fill('65');
  await expect(page.getByRole('slider', { name: 'Camera zoom' })).toHaveAttribute(
    'aria-valuetext',
    '65%',
  );
  await page.screenshot({ path: 'test-results/settings-zoom.png' });
  await page.getByRole('button', { name: 'DONE' }).click();
  await play(page);
  await expect.poll(() => musicPlaying(page)).toBe(true);
  await page.getByRole('button', { name: 'Pause game' }).focus();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio
      .filter((audio) => audio.loop)
      .at(-1)!
      .pause(),
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toHaveCount(0);
  await expect.poll(() => musicPlaying(page)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const bounds = await page.locator('.game-canvas').boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.8, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio.some(
          (audio) => !audio.loop && audio.duration > 0 && !audio.error,
        ),
      ),
    )
    .toBe(true);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Enter fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.screenshot({ path: 'test-results/mock-fullscreen-zoom.png' });
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.keyboard.press('KeyP');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.evaluate(() =>
    document.fullscreenElement ? document.exitFullscreen() : Promise.resolve(),
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).settings.zoom,
    ),
  ).toBe(0.65);
});

test('cleared origin can be revisited and its traveled map edge is drawn once', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await play(page);
  await page.locator('.game-canvas').focus();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2900);
  await page.keyboard.up('KeyD');
  const map = page.getByRole('button', { name: 'Change map size' });
  await map.click();
  await expect(page.locator('#map-description')).toContainText('Map: Large. Position (1, 0)');
  await expect(page.locator('#map-description')).toContainText('1 traveled paths');
  await expect(page.getByLabel('Field guide')).toHaveText('Armor Games');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyA');
  await expect(page.locator('#map-description')).toContainText('Position (0, 0)');
  await expect(page.locator('#map-description')).toContainText('1 traveled paths');
  await expect(page.getByLabel('Field guide')).toContainText(
    'You have jumped to a new bubblefield!',
  );
  await map.click();
  await expect(page.locator('#map-description')).toContainText('Map: Hidden');
  await map.press('Enter');
  await expect(page.locator('#map-description')).toContainText('Map: Compact');
});

test('original SWF music resumes and player volleys play extracted audio', async ({ page }) => {
  const swf =
    process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
  test.skip(!existsSync(swf), 'A local research SWF is required.');
  await watchAudio(page);
  await page.goto('/');
  await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  await play(page);
  await expect.poll(() => musicPlaying(page)).toBe(true);
  await page.keyboard.press('KeyP');
  await page.evaluate(() =>
    (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio
      .filter((audio) => audio.loop)
      .at(-1)!
      .pause(),
  );
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect.poll(() => musicPlaying(page)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const bounds = await page.locator('.game-canvas').boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * 0.8, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio.some(
          (audio) => !audio.loop && audio.duration > 0 && !audio.error,
        ),
      ),
    )
    .toBe(true);
  await page.mouse.up();
});
