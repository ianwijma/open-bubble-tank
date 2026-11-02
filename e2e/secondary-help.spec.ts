import { saveCreator } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';
import { expect, test } from './helpers/frame-paced-test';
import { visitAdjacentFieldAndReturn } from './helpers/field-travel';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
const STARTER: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} secondary help pauses on avatar replacement and persists before closing`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const guard = {
      ...STARTER,
      id: 'guard-shield',
      name: 'Guarded shield tank',
      parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'shield', type: 3010, x: 0, y: 0 }],
    };
    await page.addInitScript(
      (profile) => {
        if (!localStorage.getItem('open-bubble-tank.profile.v1'))
          localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile));
      },
      {
        version: 1,
        tanks: [],
        achievements: [],
        nextTankId: 10000001,
        settings: DEFAULT_SETTINGS,
        progression: [STARTER, ...Array(6).fill(guard)],
      },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const enter = async () => {
      await page.goto('/');
      if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
      else await page.getByRole('button', { name: 'Play with mock assets' }).click();
      await waitForMainMenu(page);
      await page.getByRole('button', { name: 'Play', exact: true }).click({ timeout: 60000 });
      await page.getByRole('button', { name: 'Original game size', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Use saved avatars from previous game' }).check();
      await page
        .getByRole('dialog', { name: 'Choose your tanks' })
        .getByRole('button', { name: 'PLAY', exact: true })
        .click();
      await expect(page.locator('.game-canvas canvas')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0); // Initial PlaceAvatar branch does not show help.
      await page.locator('.game-canvas').focus();
      await page.keyboard.down('Space');
      await visitAdjacentFieldAndReturn(page);
      await page.keyboard.up('Space');
      await page.getByRole('button', { name: 'Edit your tank', exact: true }).click();
      await page.getByRole('button', { name: 'YES', exact: true }).click();
      await page.getByRole('button', { name: 'Edit Your Current Tank', exact: true }).click();
      await saveCreator(page);
    };
    await enter();
    const help = page.getByRole('dialog', { name: 'Secondary weapon help' });
    await expect(help).toBeVisible();
    await expect(help).toContainText('You have a secondary weapon');
    if (native) {
      // Authored rasters include padding and can exceed their parent; preflight must not shrink them.
      const errors = await help.locator('img').evaluateAll((images) =>
        images.map((element) => {
          const image = element as HTMLImageElement;
          return Math.abs(
            parseFloat(getComputedStyle(image).width) - parseFloat(image.style.width),
          );
        }),
      );
      expect(errors).toHaveLength(3);
      for (const error of errors) expect(error).toBeLessThan(0.02);
    }
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).secondaryHelpSeen,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyP');
    await expect(help).toBeVisible();
    const health = await page.getByLabel('Tank health').textContent();
    await page.waitForTimeout(300);
    await expect(page.getByLabel('Tank health')).toHaveText(health!);
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-secondary-help.png` });
    if (!native) {
      await help.getByRole('button', { name: 'Close secondary weapon help' }).click();
      await expect(help).toHaveCount(0);
      await page.keyboard.press('KeyP');
      await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
      await page.keyboard.press('KeyP');
    }
    // Native mode reloads with help still open; mock mode also exercises its explicit Close button.
    await enter();
    await expect(help).toHaveCount(0);
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
