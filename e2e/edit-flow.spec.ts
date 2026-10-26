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
  test(`${native ? 'SWF' : 'mock'} edit slider: native map variants, confirmation, same-level choice and editor cancellation`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const guard = {
      ...STARTER,
      id: 'guard',
      name: 'Guarded Minnow',
      parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'forcefield', type: 5005, x: 0, y: 0 }],
    };
    await page.addInitScript(
      (profile) => localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile)),
      {
        version: 1,
        secondaryHelpSeen: true, // The dedicated help flow covers its first-time interruption.
        tanks: [],
        achievements: [],
        nextTankId: 10000001,
        settings: DEFAULT_SETTINGS,
        progression: [STARTER, ...Array(6).fill(guard)],
      },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({
      timeout: 60000,
    });
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click({ timeout: 60000 });
    await page.getByRole('checkbox', { name: 'Use saved avatars from previous game' }).check();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    const edit = page.getByRole('button', { name: 'Edit your tank', exact: true });
    await expect(edit).toBeDisabled();
    await page.locator('.game-canvas').focus();
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(2900);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyA');
    await expect(edit).toBeEnabled({ timeout: 5000 });
    await expect.poll(async () => (await edit.boundingBox())!.width).toBeCloseTo(122, 0);
    const map = page.getByRole('button', { name: 'Change map size' });
    await map.click();
    await expect.poll(async () => (await edit.boundingBox())!.width).toBeCloseTo(401.45, 0);
    await map.click();
    await expect.poll(async () => (await edit.boundingBox())!.width).toBeCloseTo(24, 0);
    await map.click();
    await expect.poll(async () => (await edit.boundingBox())!.width).toBeCloseTo(122, 0);
    await edit.click();
    const confirm = page.getByRole('dialog', { name: 'Edit your tank?', exact: true });
    await expect(confirm).toContainText(
      'Your bubble total will restart at the last upgrade point.',
    );
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-edit-confirm.png` });
    await confirm.getByRole('button', { name: 'NO', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(edit).toBeEnabled();
    await edit.focus();
    await edit.press('Space');
    await confirm.getByRole('button', { name: 'YES', exact: true }).click();
    const choice = page.getByRole('dialog', { name: 'Upgrade your tank', exact: true });
    await expect(choice).toBeVisible();
    await choice.getByRole('button', { name: 'Edit Your Current Tank', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Exit tank creator', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Exit tank creator', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(edit).toBeEnabled();
    await edit.click();
    await confirm.getByRole('button', { name: 'YES', exact: true }).click();
    await choice
      .getByRole('button', { name: /^Choose / })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByLabel('Tank health')).toContainText('27 of 2000 health');
    expect(errors).toEqual([]);
  });
