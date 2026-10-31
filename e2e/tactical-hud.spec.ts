import { waitForMainMenu } from './helpers/main-menu';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
const STARTER: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} field readouts follow summoning, arrival, pause and zoom`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const tank = {
      ...STARTER,
      id: 'readout-fixture',
      name: 'Field Readout Tank',
      parts: [
        ...STARTER.parts,
        ...[5001, 5002, 3007, 5005].map((type, i) => ({
          ...STARTER.parts[1],
          key: `extra${i}`,
          type,
          x: 0,
          y: 0,
        })),
      ],
    };
    await page.addInitScript(
      (profile) => localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile)),
      {
        version: 1,
        secondaryHelpSeen: true,
        tanks: [],
        achievements: [],
        nextTankId: 10000001,
        settings: DEFAULT_SETTINGS,
        progression: [STARTER, ...Array(6).fill(tank)],
      },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
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
    const readouts = page.getByLabel('Field readouts');
    await expect(readouts).toContainText('Allies: 0. Enemy health readouts: 0.');
    await page.locator('.game-canvas').focus();
    await page.keyboard.down('Space');
    await expect(readouts).toContainText('Allies: 1.');
    await page.keyboard.up('Space');
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-ally-health.png` });
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(2900);
    await page.keyboard.up('KeyD');
    await expect(readouts).toContainText(/Enemy health readouts: [1-9]/);
    await expect(readouts).toContainText('Allies: 0.');
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
    const frozen = await readouts.textContent();
    await page.waitForTimeout(200);
    await expect(readouts).toHaveText(frozen!);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('slider', { name: 'Camera zoom' }).fill('65');
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(readouts).toContainText(/Enemy health readouts: [1-9]/);
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-field-readouts.png` });
    expect(errors).toEqual([]);
  });
