import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview, saveCreator } from './helpers/creator';
const starter = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator: authored exit/name/code dialogs, saved return and offline sharing`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local SWF is required.');
    const errors: string[] = [],
      external: string[] = [],
      popups: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('popup', (p) => popups.push(p.url()));
    page.on('request', (r) => {
      if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(r.url()) && !/^(data|blob):/.test(r.url()))
        external.push(r.url());
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copied: string }).copied = text;
          },
        },
      });
    });
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'fixture.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({ ...starter, id: 'saved-fixture', name: 'Save fixture' }),
      ),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const read = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!));
    await page.getByRole('button', { name: 'Exit tank creator', exact: true }).click();
    const exit = page.getByRole('dialog', { name: 'Exit tank creator?', exact: true });
    await expect(exit).toContainText('Are you sure you want to exit without saving?');
    await expect(page.getByRole('button', { name: 'SAVE', exact: true })).toHaveCount(0);
    await page
      .locator('.creator-save-dialog')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-exit.png` });
    await exit.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Exit tank creator', exact: true }),
    ).toBeFocused();
    expect((await read()).tanks).toHaveLength(1);
    const canvas = await page.locator('.creator-workspace canvas').elementHandle();
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Save your tank', exact: true });
    const author = form.getByRole('textbox', { name: 'Author name', exact: true }),
      name = form.getByRole('textbox', { name: 'Tank name', exact: true });
    await expect(author).toHaveValue('BubbleTanks3');
    await expect(name).toHaveValue('Save fixture');
    await expect(page.locator('.creator')).toHaveAttribute('inert', '');
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(author).toHaveAttribute('maxlength', '20');
    await expect(name).toHaveAttribute('maxlength', '25');
    await author.fill("Alice O'Brien");
    await name.fill('  Faithful Tank  ');
    await name.press('End');
    await page.keyboard.insertText('!');
    await expect(name).toHaveValue('  Faithful Tank  ');
    await page
      .locator('.creator-save-dialog')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-save-name.png` });
    await name.fill('');
    await form.getByRole('button', { name: 'Continue', exact: true }).click();
    const error = page.getByRole('dialog', { name: 'Tank submission error', exact: true });
    await expect(error).toContainText('You cannot submit tanks with nothing in them...Thanks!');
    expect((await read()).nextTankId).toBe(10000002);
    expect((await read()).tanks).toHaveLength(1);
    await error.getByRole('button', { name: 'Return to editing', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await author.fill("Alice O'Brien");
    await name.fill('  Faithful Tank  ');
    await form.getByRole('button', { name: 'Continue', exact: true }).click();
    const saved = page.getByRole('dialog', { name: 'Tank saved', exact: true }),
      code = saved.getByRole('textbox', { name: 'Saved tank code', exact: true });
    await expect(code).not.toHaveValue('');
    expect((await read()).tanks[1]).toMatchObject({
      id: 'L10000002',
      name: '  Faithful Tank  ',
      author: "Alice O'Brien",
    });
    await code.click();
    expect(
      await code.evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart),
    ).toBe((await code.inputValue()).length);
    await saved.getByRole('button', { name: 'Copy tank code', exact: true }).click();
    await expect(saved.getByRole('status')).toContainText('Tank code copied.');
    expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(
      await code.inputValue(),
    );
    await page
      .locator('.creator-save-dialog')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-saved-code.png` });
    await saved.getByRole('button', { name: 'Return to editing', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await read()).tanks).toHaveLength(2);
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await name.fill('Second Saved Copy');
    await form.getByRole('button', { name: 'Continue', exact: true }).click();
    await saved.getByRole('button', { name: 'Share tank online', exact: true }).click();
    await expect(error).toContainText('Community tank sharing is not connected.');
    expect((await read()).tanks).toHaveLength(3);
    await error.getByRole('button', { name: 'Exit creator', exact: true }).click();
    await expect(page.getByText('Faithful Tank', { exact: true })).toBeVisible();
    await expect(page.getByText('Second Saved Copy', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    expect(popups).toEqual([]);
  });

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} fresh creator names stay in the form and failed submission IDs survive reload`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local SWF is required.');
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await dropPreview(page, 0, 0);
    const read = () =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem('open-bubble-tank.profile.v1') ??
            '{"tanks":[],"nextTankId":10000001}',
        ),
      );
    const canvas = await page.locator('.creator-workspace canvas').elementHandle();
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Save your tank', exact: true });
    await expect(form.getByRole('textbox', { name: 'Tank name', exact: true })).toHaveValue('');
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await read()).nextTankId).toBe(10000001);
    await saveCreator(page, { name: '  New Tank  ', author: 'A B', exit: false });
    expect((await read()).tanks[0]).toMatchObject({
      id: 'L10000001',
      name: '  New Tank  ',
      author: 'A B',
    });
    await expect(page.locator('.creator')).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: 'Return to editing', exact: true }).click();
    expect(await canvas!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(page.locator('.creator')).not.toHaveAttribute('inert', '');
    await page.getByRole('button', { name: 'SAVE', exact: true }).click();
    await expect(form.getByRole('textbox', { name: 'Tank name', exact: true })).toHaveValue('');
    await expect(form.getByRole('textbox', { name: 'Author name', exact: true })).toHaveValue(
      'BubbleTanks3',
    );
    await form.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Tank submission error', exact: true }),
    ).toBeVisible();
    expect((await read()).nextTankId).toBe(10000003);
    expect((await read()).tanks).toHaveLength(1);
    await page.getByRole('button', { name: 'Exit creator', exact: true }).click();
    await waitForMainMenu(page);
    await page.reload();
    expect((await read()).nextTankId).toBe(10000003);
    expect((await read()).tanks[0].name).toBe('  New Tank  ');
  });
