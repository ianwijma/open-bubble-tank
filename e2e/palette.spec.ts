import { waitForMainMenu } from './helpers/main-menu';
import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign, TankPart } from '../src/game/core/types';
import { readCreatorDesign, dropPreview, exitCreator } from './helpers/creator';
const starter: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const part = (key: string, type: number): TankPart => ({
  key,
  type,
  x: 0,
  y: 0,
  radius: 7,
  twin: '',
  scale: 1,
  rotation: 0,
});
const budget: TankDesign = {
  ...starter,
  avatar: false,
  id: 'L10000001',
  author: 'You',
  name: 'GP Fixture',
  parts: [part('body', 1001), ...Array.from({ length: 18 }, (_, i) => part(`gun-${i}`, 4001))],
};
const complexity: TankDesign = {
  ...budget,
  id: 'L10000002',
  name: 'Complexity Fixture',
  parts: Array.from({ length: 100 }, (_, i) => part(`body-${i}`, 1001)),
};
async function importTank(page: Page, tank: TankDesign) {
  await page.getByLabel('Import tank design').setInputFiles({
    name: 'fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(tank)),
  });
  await page
    .locator('article')
    .filter({ hasText: tank.name })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
}
for (const assets of ['mock', 'SWF'])
  test(`${assets} palette dims unaffordable parts but permits selection and rolls back rejected edits`, async ({
    page,
  }) => {
    test.skip(assets === 'SWF' && !existsSync(swf), 'Provide the local reference SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (assets === 'SWF') await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click({ timeout: 60000 });
    await importTank(page, budget);
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    const rows = page.locator('.part-palette button');
    expect(
      await rows.evaluateAll((rows) =>
        rows.slice(0, 3).map((row) => row.getAttribute('aria-label')),
      ),
    ).toEqual(['Place Basic Cannon', 'Place Mine Dropper', 'Place Seeker Carrier']);
    const basic = page.getByRole('button', { name: 'Place Basic Cannon', exact: true });
    const seekers = page.getByRole('button', { name: 'Place Seekers', exact: true });
    await expect(basic).toHaveCSS('opacity', '1');
    await expect(basic).toHaveAttribute('aria-pressed', 'true');
    await expect(seekers).toHaveCSS('opacity', '0.4');
    await expect(seekers).toBeEnabled();
    await seekers.click();
    await expect(seekers).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Drag Seekers into design', exact: true }),
    ).toBeEnabled();
    await dropPreview(page, 30, 0);
    const alert = page.getByRole('alertdialog', { name: 'Tank creator error' });
    await expect(alert).toContainText('Not enough Gun Points!');
    expect((await readCreatorDesign(page)).parts).toHaveLength(19);
    await expect(page.locator('.creator-meters > div').last()).toContainText('GP: 18');
    await alert.press('Enter');
    await page.getByRole('button', { name: 'Body', exact: true }).click();
    const small = page.getByRole('button', { name: 'Place Small Bubble', exact: true });
    await expect(small).toBeEnabled();
    await expect(small).toHaveCSS('opacity', '1');
    await small.click();
    await expect(
      page.getByRole('button', { name: 'Drag Small Bubble into design', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toHaveLength(0);
    await expect(alert).toHaveCount(0);
    await exitCreator(page);
    await importTank(page, complexity);
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Choose a part', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Body', exact: true }).click();
    await expect(small).toHaveCSS('opacity', '0.4');
    await small.click();
    await dropPreview(page, 100, 0);
    await expect(alert).toContainText('Excedes max complexity.');
    expect((await readCreatorDesign(page)).parts).toHaveLength(100);
    await page.screenshot({ path: `test-results/${assets}-palette-complexity.png` });
    await expect(page.locator('.creator')).toHaveAttribute('inert', '');
    const alertBox = (await alert.boundingBox())!,
      creatorBox = (await page.locator('.creator').boundingBox())!;
    expect(alertBox.width).toBe(creatorBox.width);
    expect(alertBox.height).toBe(creatorBox.height);
    await alert.press('Enter');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toHaveLength(0);
    await expect(alert).toHaveCount(0);
    expect(errors).toEqual([]);
  });
