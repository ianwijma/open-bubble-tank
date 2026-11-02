import { exitCreator } from './helpers/creator';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { waitForMainMenu } from './helpers/main-menu';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const STARTER = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator category tabs retain source geometry, rollover paint and mode-specific choices`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    const creator = page.locator('.creator'),
      canvas = page.locator('.creator-workspace canvas'),
      tabs = page.getByRole('group', { name: 'Part categories' }),
      tab = (name: string) => tabs.getByRole('button', { name, exact: true });
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(350);
    const geometry = async (name: string, y: number, height: number) => {
      const stage = (await creator.boundingBox())!,
        bounds = (await tab(name).boundingBox())!,
        scale = stage.width / 550;
      // Chromium quantizes each nested CSS position to 1/64px; allow one source twip.
      expect((bounds.x - stage.x) / scale).toBeCloseTo(374, 1);
      expect((bounds.y - stage.y) / scale).toBeCloseTo(y, 1);
      expect(bounds.width / scale).toBeCloseTo(18, 1);
      expect(bounds.height / scale).toBeCloseTo(height, 1);
    };
    await expect(tabs.getByRole('button')).toHaveCount(3);
    await geometry('Body', 172.38788, 37);
    await geometry('Weapons', 211.9894, 53);
    await geometry('Behavior', 267.98636, 54);
    await expect(tab('Body')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Place Huge Base Bubble', exact: true }).click();
    await tab('Body').click();
    await expect(
      page.getByRole('button', { name: 'Drag Huge Base Bubble into design' }),
    ).toBeVisible();
    const art = tab('Weapons').locator(native ? 'img' : 'svg');
    const paint = async () => {
      if (native)
        await expect
          .poll(() =>
            art.evaluate((node) => {
              const img = node as HTMLImageElement;
              return img.complete && img.naturalWidth > 0;
            }),
          )
          .toBe(true);
      return createHash('sha256')
        .update(await art.screenshot())
        .digest('hex');
    };
    const inactive = await paint();
    await tab('Weapons').hover();
    const rollover = await paint();
    expect(rollover).not.toBe(inactive);
    await expect(tab('Weapons')).toHaveAttribute('aria-pressed', 'false');
    await canvas.hover();
    expect(await paint()).toBe(inactive);
    await tab('Weapons').click();
    await canvas.hover();
    expect(await paint()).toBe(rollover); // The selected tab retains frame1 after pointer exit.
    await expect(tab('Weapons')).toHaveAttribute('aria-pressed', 'true');
    await expect(tab('Body')).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Place Basic Cannon', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Drag Basic Cannon into design' })).toBeVisible();
    await tab('Behavior').press('Enter');
    await expect(tab('Behavior')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Place Aggressor', exact: true })).toBeVisible();
    await creator.screenshot({ path: testInfo.outputPath('enemy-tabs.png') });
    await exitCreator(page);
    await expect(tabs).toHaveCount(0);
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'avatar-tabs.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...STARTER, id: 'avatar-tabs', name: 'Avatar tabs' })),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(tabs.getByRole('button')).toHaveCount(4);
    await expect(tab('Weapons')).toHaveCount(0);
    await expect(tab('Behavior')).toHaveCount(0);
    await geometry('Primary', 211.99848, 50);
    await geometry('Secondary', 265.01821, 60);
    await geometry('Passive', 328.00152, 49);
    await tab('Primary').click();
    await expect(
      page.getByRole('button', { name: 'Place Basic Cannon', exact: true }),
    ).toBeVisible();
    await tab('Secondary').press('Enter');
    await expect(page.getByRole('button', { name: /^(Place )?Sticky Burst(?:,|$)/ })).toHaveCount(
      1,
    );
    await tab('Passive').press('Space');
    await expect(tab('Passive')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^(Place )?Radar(?:,|$)/ })).toHaveCount(1);
    await creator.screenshot({ path: testInfo.outputPath('avatar-tabs.png') });
    expect(errors).toEqual([]);
  });
