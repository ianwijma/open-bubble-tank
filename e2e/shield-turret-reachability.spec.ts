import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { shieldTurretCaller } from '../tests/fixtures/shield-turret-caller';
import { waitForMainMenu } from './helpers/main-menu';
import { readCreatorDesign, saveCreator } from './helpers/creator';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} valid Shield Turrets creator save enables the optional local-enemy caller`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets', exact: true }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'shield-caller.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(shieldTurretCaller())),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const design = await readCreatorDesign(page);
    expect(design.classId).toBe(3); // Actual mock/native body pixel measurement.
    expect(design.parts.at(-1)!.type).toBe(4032);
    // The unit proof validates this exact layout/class and its manual stats.
    expect(design.parts).toEqual(shieldTurretCaller().parts);
    expect(design).toMatchObject({ avatar: false, life: 20, reward: 5, speed: 2 });
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-shield-caller-creator.png` });
    await saveCreator(page, { name: 'Saved Shield Caller' });
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).tanks.find(
        (tank: { id: string }) => tank.id === 'L10000001',
      ),
    );
    expect(saved).toMatchObject({
      name: 'Saved Shield Caller',
      avatar: false,
      classId: 3,
      life: 20,
      reward: 5,
      speed: 2,
    });
    expect(saved.parts.at(-1).type).toBe(4032);
    await page.getByRole('button', { name: 'Back to main menu', exact: true }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const local = page.getByRole('checkbox', { name: /My enemy tanks/ });
    await expect(local).toBeEnabled();
    await expect(local).not.toBeChecked();
    await local.check();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-shield-caller-sources.png` });
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    await page.getByRole('button', { name: 'Pause game', exact: true }).click();
    expect(errors).toEqual([]);
  });
