import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview } from './helpers/creator';
import type { TankDesign } from '../src/game/core/types';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function snapshot(page: Page): Promise<TankDesign> {
  const wait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync((await (await wait).path())!, 'utf8'));
}
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} enemy info retains source defaults, quadratic sliders, confirmation and manual save`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    expect(await snapshot(page)).toMatchObject({ life: 20, reward: 20, speed: 2, parts: [] });
    await expect(page.locator('.creator-inspector')).toHaveCount(0);
    await page.getByLabel('Symmetric Mode').uncheck();
    await dropPreview(page, 0, 0);
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    const life = page.getByRole('textbox', { name: 'Enemy life', exact: true }),
      reward = page.getByRole('textbox', { name: 'Enemy reward', exact: true }),
      speed = page.getByRole('textbox', { name: 'Enemy speed', exact: true }),
      suggested = page.getByRole('checkbox', { name: 'Use Suggested Settings' });
    await expect(suggested).toBeChecked();
    await expect(life).toHaveValue('1');
    await expect(speed).toHaveValue('3');
    await expect(life).toHaveAttribute('readonly', '');
    await suggested.uncheck();
    await life.fill('1');
    await reward.fill('125');
    await speed.fill('2.');
    await expect(speed).toHaveValue('2.');
    expect((await snapshot(page)).speed).toBe(3);
    await speed.fill('2.75');
    await expect(speed).toHaveValue('2.75');
    const range = page.getByLabel('Enemy life slider'),
      r = (await range.boundingBox())!,
      scale = r.width / 138;
    await page.mouse.click(r.x + (69 + 50) * scale, r.y + (12 + 2.25) * scale);
    await expect(life).toHaveValue('1');
    await page.mouse.move(r.x + (69 - 55) * scale, r.y + (12 + 2.25) * scale);
    await page.mouse.down();
    await page.mouse.move(r.x + 69 * scale, r.y + (12 + 2.25) * scale, { steps: 8 });
    await page.mouse.up();
    await expect(life).toHaveValue('250');
    await life.fill('9999');
    await expect(life).toHaveValue('1000');
    await reward.fill('oops');
    await expect(reward).toHaveValue('1');
    await suggested.click();
    const dialog = page.getByRole('dialog', { name: 'Replace manual enemy statistics' });
    await expect(dialog).toHaveAttribute('data-confirm-frame', '12');
    await expect(dialog.locator('[data-creator-field]')).toHaveCount(3);
    await page.getByRole('button', { name: 'No, keep manual settings' }).hover();
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-enemy-confirm.png` });
    await page.getByRole('button', { name: 'No, keep manual settings' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(suggested).not.toBeChecked();
    await expect(life).toHaveValue('1000');
    await suggested.click();
    await expect(dialog).toHaveAttribute('data-confirm-frame', '12');
    await page.getByRole('button', { name: 'Yes, use suggested settings' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(suggested).toBeChecked();
    await expect(life).toHaveValue('1');
    await page.getByRole('button', { name: 'Tank statistics', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enemy Info', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await suggested.uncheck();
    await life.fill('333');
    await reward.fill('77');
    await speed.fill('2.75');
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-enemy-info.png` });
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    const read = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1') ?? '{"tanks":[]}').tanks,
      );
    await expect.poll(async () => (await read()).length).toBe(1);
    expect((await read())[0]).toMatchObject({ life: 333, reward: 77, speed: 2.75 });
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await expect(suggested).not.toBeChecked();
    await expect(life).toHaveValue('333');
    // Re-enable suggestions, add another body after leaving the panel, and save without reopening it.
    await suggested.click();
    await expect(dialog).toHaveAttribute('data-confirm-frame', '12');
    await page.getByRole('button', { name: 'Yes, use suggested settings' }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Tank statistics', exact: true }).click();
    await dropPreview(page, 30, 0);
    const design = await snapshot(page);
    expect(design.life).toBe(1);
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await expect.poll(async () => (await read()).length).toBe(2);
    expect((await read())[1]).toMatchObject({
      life: Math.round(design.parts.length / 2) * design.classId,
      reward: 1,
      speed: 3,
    });
    expect(errors).toEqual([]);
  });
