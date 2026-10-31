import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview, exitCreator, readCreatorDesign } from './helpers/creator';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const starter = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator restores empty-save alert, retained fade and fresh name defaults`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    const save = page.getByRole('button', { name: 'SAVE', exact: true }),
      alert = page.getByRole('alertdialog', { name: 'Tank creator error' });
    await save.click();
    await expect(alert).toContainText('You must have at least 1 bubble to save a tank');
    await expect(alert).toHaveAttribute('data-alert-alpha', '1');
    if (native) await expect(alert.locator(':scope > img')).toBeVisible();
    await expect(page.locator('.creator-editor-content')).toHaveAttribute('inert', '');
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-empty-alert.png` });
    // A release anywhere on the alert closes it; it does not select the row behind it.
    const bounds = (await page.locator('.creator').boundingBox())!;
    await page.mouse.click(bounds.x + bounds.width * 0.91, bounds.y + bounds.height * 0.89);
    await expect(alert).toHaveCount(0);
    await expect(save).toBeFocused();
    await save.click();
    await expect(alert).toHaveAttribute('data-alert-alpha', '1');
    await expect
      .poll(async () => Number(await alert.getAttribute('data-alert-alpha')))
      .toBeLessThan(0.98);
    const faded = Number(await alert.getAttribute('data-alert-alpha'));
    expect(Number.isInteger(faded * 256)).toBe(true);
    await alert.getByRole('button', { name: 'Dismiss creator error' }).click();
    await save.click();
    expect(Number(await alert.getAttribute('data-alert-alpha'))).toBeLessThanOrEqual(faded);
    // The older fade keeps advancing while the replacement's two-second Timer runs.
    await expect(alert).toHaveCount(0, { timeout: 6000 });
    await expect(save).toBeFocused();
    await expect(page.locator('.creator-editor-content')).not.toHaveAttribute('inert', '');
    await expect(page.getByRole('textbox', { name: 'Tank name', exact: true })).toHaveCount(0);
    await expect(
      page.locator('.creator').getByRole('button', { name: 'Export', exact: true }),
    ).toHaveCount(0);
    await dropPreview(page, 0, 0);
    await save.click();
    const form = page.getByRole('dialog', { name: 'Save your tank', exact: true }),
      name = form.getByRole('textbox', { name: 'Tank name', exact: true }),
      author = form.getByRole('textbox', { name: 'Author name', exact: true });
    await expect(name).toHaveValue('');
    await expect(author).toHaveValue('BubbleTanks3');
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-fresh-name.png` });
    await name.fill('Fresh Bubble');
    await author.fill('Alternate Author');
    await form.getByRole('button', { name: 'Continue', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Tank saved', exact: true })
      .getByRole('button', { name: 'Return to editing', exact: true })
      .click();
    await save.click();
    await expect(name).toHaveValue('');
    await expect(author).toHaveValue('BubbleTanks3');
    const tanks = await page.evaluate(
      () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).tanks,
    );
    expect(tanks).toHaveLength(1);
    expect(tanks[0]).toMatchObject({ name: 'Fresh Bubble', author: 'Alternate Author' });
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    await exitCreator(page);
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'no-weapon.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          ...starter,
          id: 'body-only',
          name: 'No weapon',
          parts: [starter.parts[0]],
        }),
      ),
    });
    await page
      .locator('.saved-tanks article')
      .filter({ has: page.getByText('No weapon', { exact: true }) })
      .getByRole('button', { name: 'Edit', exact: true })
      .click();
    const canvas = (await page.locator('.creator-workspace canvas').boundingBox())!;
    await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await expect(page.getByLabel('Part scale')).toBeVisible();
    const before = await readCreatorDesign(page);
    await save.click();
    await expect(alert).toContainText('You must have at least 1 weapon to save an Avatar tank');
    expect((await readCreatorDesign(page)).parts).toEqual(before.parts);
    await alert.press('Enter');
    await expect(alert).toHaveCount(0);
    await expect(page.getByLabel('Part scale')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    expect(errors).toEqual([]);
  });
