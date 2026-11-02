import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview, saveCreator } from './helpers/creator';
import type { TankDesign } from '../src/game/core/types';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function snapshot(page: Page): Promise<TankDesign> {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'));
}
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} enemy defaults, panel suggestions and automatic versus manual saves retain source values`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    expect(await snapshot(page)).toMatchObject({ life: 20, reward: 20, speed: 2, parts: [] });
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await expect(page.getByLabel('Enemy life', { exact: true })).toHaveValue('0');
    await expect(page.getByLabel('Enemy reward', { exact: true })).toHaveValue('1');
    await expect(page.getByLabel('Enemy speed', { exact: true })).toHaveValue('3');
    expect(await snapshot(page)).toMatchObject({ life: 0, reward: 1, speed: 3, parts: [] });
    await page.getByLabel('Symmetric Mode').uncheck();
    await dropPreview(page, 0, 0);
    const design = await snapshot(page);
    expect(design.parts).toHaveLength(1);
    expect(design).toMatchObject({ classId: 1, life: 0 });
    // Save recalculates from the changed geometry even when the earlier panel readout is stale.
    await saveCreator(page);
    const saved = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1') ?? '{"tanks":[]}').tanks,
      );
    await expect.poll(async () => (await saved()).length).toBe(1);
    expect((await saved())[0]).toMatchObject({ life: 1, reward: 1, speed: 3 });
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    const suggested = page.getByRole('checkbox', { name: 'Use Suggested Settings', exact: true });
    await suggested.click();
    const dialog = page.getByRole('dialog', { name: 'Replace manual enemy statistics' });
    await expect(dialog).toHaveAttribute('data-confirm-frame', '12');
    await page.getByRole('button', { name: 'Yes, use suggested settings', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(suggested).toBeChecked();
    await suggested.uncheck();
    await page.getByLabel('Enemy life', { exact: true }).fill('333');
    await page.getByLabel('Enemy reward', { exact: true }).fill('77');
    await page.getByLabel('Enemy speed', { exact: true }).fill('2.75');
    await page.getByRole('button', { name: 'Tank statistics', exact: true }).click();
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await expect(page.getByLabel('Enemy life', { exact: true })).toHaveValue('333');
    await saveCreator(page);
    await expect.poll(async () => (await saved()).length).toBe(2);
    expect((await saved())[1]).toMatchObject({ life: 333, reward: 77, speed: 2.75 });
    expect(errors).toEqual([]);
  });
