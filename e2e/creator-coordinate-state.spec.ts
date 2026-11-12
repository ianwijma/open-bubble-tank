import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import type { TankDesign } from '../src/game/core/types';
import { readCreatorDesign, readDisplayedCreatorDesign, saveCreator } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator retains fractional saved coordinates through display, nudge, drag release and undo`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'fractional.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          ...starter,
          id: 'fractional',
          name: 'Fractional',
          avatar: false,
          sourceCode: undefined,
          parts: [
            {
              key: '1_mc',
              type: 1001,
              twin: '',
              x: 7.125,
              y: -9.875,
              rotation: 0,
              scale: 1,
              radius: 7,
            },
          ],
        }),
      ),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
    const saved = async () => (await readCreatorDesign(page)).parts[0],
      displayed = async () => (await readDisplayedCreatorDesign(page)).parts[0];
    expect(await saved()).toMatchObject({ x: 7.125, y: -9.875 });
    expect(await displayed()).toMatchObject({ x: 7.1, y: -9.85 });
    await saveCreator(page, { name: 'Fractional', exit: false });
    const dialog = page.getByRole('dialog', { name: 'Tank saved', exact: true });
    const field = dialog.getByRole('textbox', { name: 'Saved tank code', exact: true });
    await expect(field).not.toHaveValue('');
    const code = await field.inputValue();
    const decoded = JSON.parse(
      execFileSync(
        'bun',
        [
          '-e',
          "import {decodeTankCode} from './src/game/services/tank-code';console.log(JSON.stringify((await decodeTankCode(await Bun.stdin.text())).parts));",
        ],
        { input: code, encoding: 'utf8' },
      ),
    );
    expect(decoded[0]).toMatchObject({ x: 7.125, y: -9.875 });
    await dialog.getByRole('button', { name: 'Return to editing', exact: true }).click();
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    const canvas = page.locator('.creator-workspace canvas');
    await expect.poll(async () => (await canvas.boundingBox())!.width).toBe(350);
    const at = async (x: number, y: number) => {
      const b = (await canvas.boundingBox())!;
      return { x: b.x + x + 175, y: b.y + y + 175 };
    };
    let p = await at(7.1, -9.85);
    await page.mouse.click(p.x, p.y);
    await expect(page.getByRole('status')).toContainText('Selected parts (1)');
    await page.getByRole('button', { name: 'Move selection right', exact: true }).press('Enter');
    expect(await saved()).toMatchObject({ x: 8.125, y: -9.875 });
    expect(await displayed()).toMatchObject({ x: 8.1, y: -9.85 });
    p = await at(8.1, -9.85);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 1, p.y);
    await page.mouse.move(p.x, p.y);
    expect(await saved()).toMatchObject({ x: 8.125, y: -9.875 });
    expect(await displayed()).toMatchObject({ x: 8.1, y: -9.85 });
    await page.mouse.up();
    expect(await saved()).toMatchObject({ x: 8.1, y: -9.85 });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await saved()).toMatchObject({ x: 8.125, y: -9.875 });
    expect(await displayed()).toMatchObject({ x: 8.1, y: -9.85 });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await saved()).toMatchObject({ x: 7.125, y: -9.875 });
    expect(await displayed()).toMatchObject({ x: 7.1, y: -9.85 });
    expect(errors).toEqual([]);
  });
