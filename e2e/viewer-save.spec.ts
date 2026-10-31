import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { encodeFixtureTank } from './helpers/tank-code';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const enemy: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .enemy_tanks[0];
const savedTanks = (page: Page): Promise<TankDesign[]> =>
  page.evaluate(() => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).tanks);
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer save keeps source button states, suppresses geometry duplicates and preserves shared-ID designs`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const key = 'open-bubble-tank.profile.v1';
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            tankViewerHelpSeen: true,
            creatorHelpSeen: true,
            tanks: [],
            settings: {},
          }),
        );
    });
    const assets = async () => {
      if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
      else await page.getByRole('button', { name: 'Play with mock assets' }).click();
      await waitForMainMenu(page);
    };
    await page.goto('/');
    await assets();
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    const viewer = page.locator('.tank-viewer');
    await expect(viewer).toHaveAttribute('data-viewer-ready', 'true');
    const load = async (tank: TankDesign) => {
      await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
      const code = page.getByRole('dialog', { name: 'Enter tank code' });
      await code
        .getByRole('textbox', { name: 'Tank code' })
        .fill(tank.sourceCode ?? encodeFixtureTank(tank));
      await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
      await expect(viewer.locator('.viewer-card')).toHaveCount(1);
      await expect(viewer.locator('.viewer-card')).toContainText(tank.name);
    };
    const saveButton = (name: string, detail = false) =>
      viewer
        .locator(detail ? '.viewer-detail' : '.viewer-card')
        .getByRole('button', { name: `Save locally ${name}`, exact: true });
    const detail = async (name: string) => {
      await page.getByRole('button', { name: `Details for ${name}`, exact: true }).click();
      await expect(saveButton(name, true)).toBeVisible();
    };
    // Even a built-in's imported code has a Save button. A duplicate card uses frame3.
    await load(enemy);
    await saveButton(enemy.name).click();
    await expect(saveButton(enemy.name)).toBeDisabled();
    await expect(saveButton(enemy.name)).toHaveAttribute('data-viewer-button-frame', '3');
    expect(await savedTanks(page)).toHaveLength(0);
    await detail(enemy.name);
    await saveButton(enemy.name, true).click();
    await expect(saveButton(enemy.name, true)).toHaveAttribute('data-viewer-button-frame', '4');
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-save-duplicate.png`,
    });

    const first = { ...enemy, id: 'L10000099', name: 'AAA First Saved', sourceCode: undefined };
    await load(first);
    await expect(
      page.getByRole('button', { name: `Delete ${first.name}`, exact: true }),
    ).toHaveCount(0);
    await saveButton(first.name).click();
    await expect(saveButton(first.name)).toBeDisabled();
    await expect(saveButton(first.name)).toHaveAttribute('data-viewer-button-frame', '3');
    expect((await savedTanks(page)).map((t) => t.name)).toEqual([first.name]);
    await detail(first.name);
    await expect(
      page.getByRole('button', { name: `Delete ${first.name}`, exact: true }),
    ).toHaveCount(0);
    await saveButton(first.name, true).click();
    await expect(saveButton(first.name, true)).toHaveAttribute('data-viewer-button-frame', '4');
    // Different ID/statistics still match the source's author/name/part comparison.
    await load({ ...first, id: 'L10000100', life: first.life + 1 });
    await saveButton(first.name).click();
    expect(await savedTanks(page)).toHaveLength(1);
    const second = { ...first, name: 'AAA Second Saved' };
    await load(second);
    await detail(second.name);
    await saveButton(second.name, true).click();
    await expect(saveButton(second.name, true)).toBeDisabled();
    await expect(saveButton(second.name, true)).toHaveAttribute('data-viewer-button-frame', '3');
    expect((await savedTanks(page)).map((t) => [t.id, t.name])).toEqual([
      [first.id, first.name],
      [second.id, second.name],
    ]);
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-save-new.png`,
    });

    await page.getByRole('button', { name: 'View local tanks', exact: true }).click();
    await page.getByRole('button', { name: 'Sort tanks', exact: true }).click();
    await page.getByRole('button', { name: 'Sort by name', exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Load ${first.name}`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: `Load ${second.name}`, exact: true }),
    ).toBeVisible();
    await expect(saveButton(first.name)).toHaveCount(0);
    await page.getByRole('button', { name: `Delete ${first.name}`, exact: true }).click();
    await page
      .getByRole('dialog', { name: `Delete ${first.name}?`, exact: true })
      .getByRole('button', { name: 'Yes', exact: true })
      .click();
    expect((await savedTanks(page)).map((t) => t.name)).toEqual([second.name]);
    await page.reload();
    await assets();
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'first.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(first)),
    });
    await expect(page.locator('.saved-tanks article')).toHaveCount(2);
    const row = page
      .locator('.saved-tanks article')
      .filter({ has: page.getByText(second.name, { exact: true }) });
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await row.getByRole('button', { name: 'Confirm delete', exact: true }).click();
    expect((await savedTanks(page)).map((t) => t.name)).toEqual([first.name]);
    expect(errors).toEqual([]);
  });
