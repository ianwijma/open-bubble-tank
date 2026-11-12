import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import reference from '../tests/fixtures/creator-transform-reference.json' with { type: 'json' };
import type { TankDesign, TankPart } from '../src/game/core/types';
import { readCreatorDesign, readDisplayedCreatorDesign, saveCreator } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
const parts = (values: TankPart[]) =>
  values.map(({ key, type, twin, x, y, rotation, scale, radius }) => ({
    key,
    type,
    twin,
    x,
    y,
    rotation,
    scale,
    radius,
  }));
for (const dpr of [1, 2])
  test.describe(`creator transform reference DPR${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 1100, height: 1000 } });
    for (const native of [false, true])
      test(`${native ? 'SWF' : 'mock'} slider gestures and saved codes match eight original exports`, async ({
        page,
      }) => {
        test.setTimeout(180000);
        test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const cases = reference.cases.filter((row) => row.dpr === dpr);
        await page.goto('/');
        if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
        else await page.getByRole('button', { name: 'Play with mock assets' }).click();
        await waitForMainMenu(page);
        await page.getByRole('button', { name: 'My tanks', exact: true }).click();
        await page.getByLabel('Import tank design').setInputFiles({
          name: 'transforms.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            JSON.stringify({
              ...starter,
              id: 'transforms',
              name: 'Transforms',
              avatar: false,
              sourceCode: undefined,
              parts: cases[0].before,
            }),
          ),
        });
        await page.getByRole('button', { name: 'Edit', exact: true }).click();
        await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
        await page.addStyleTag({
          content:
            '.stage-frame{position:fixed!important;left:0!important;top:0!important;width:550px!important;height:450px!important;max-width:none!important}',
        });
        await expect
          .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())!.width)
          .toBe(350);
        const stage = (await page.locator('.stage-space').boundingBox())!;
        await page.mouse.click(stage.x + 145.95, stage.y + 221.7);
        await expect(page.getByRole('status')).toContainText('Selected parts (2)');
        for (const row of cases) {
          expect(parts((await readCreatorDesign(page)).parts), row.name).toEqual(row.before);
          await page.mouse.move(stage.x + row.down.x, stage.y + row.down.y);
          await page.mouse.down();
          for (const move of row.moves) await page.mouse.move(stage.x + move.x, stage.y + move.y);
          expect(
            parts((await readDisplayedCreatorDesign(page)).parts),
            `${row.name}: held clips`,
          ).toEqual(row.expected);
          expect(
            parts((await readCreatorDesign(page)).parts),
            `${row.name}: held metadata`,
          ).toEqual(row.before);
          await page.mouse.up();
          expect(parts((await readCreatorDesign(page)).parts), `${row.name}: release`).toEqual(
            row.expected,
          );
          await saveCreator(page, { name: 'Transform reference', exit: false });
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
          expect(parts(decoded), `${row.name}: public saved code`).toEqual(row.expected);
          await dialog.getByRole('button', { name: 'Return to editing', exact: true }).click();
        }
        expect(errors).toEqual([]);
      });
  });

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} imported transform getters copy on a no-move release and cancel restores clips`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const imported = {
      key: '1_mc',
      type: 1001,
      twin: '',
      x: 7.125,
      y: -9.875,
      rotation: 270,
      scale: 1.1,
      radius: 7,
    };
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'raw-transform.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          ...starter,
          id: 'raw-transform',
          name: 'Raw transform',
          avatar: false,
          sourceCode: undefined,
          parts: [imported],
        }),
      ),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
    await page.addStyleTag({
      content:
        '.stage-frame{position:fixed!important;left:0!important;top:0!important;width:550px!important;height:450px!important;max-width:none!important}',
    });
    await expect
      .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())!.width)
      .toBe(350);
    const stage = (await page.locator('.stage-space').boundingBox())!;
    const saved = async () => (await readCreatorDesign(page)).parts[0];
    const displayed = async () => (await readDisplayedCreatorDesign(page)).parts[0];
    expect(await saved()).toEqual(imported);
    expect(await displayed()).toEqual({ ...imported, x: 7.1, y: -9.85, rotation: -90 });
    await page.mouse.click(stage.x + 193, stage.y + 222);
    await expect(page.getByRole('status')).toContainText('Selected parts (1)');
    await page.mouse.move(stage.x + 239.5, stage.y + 432.25);
    await page.mouse.down();
    await page.mouse.up();
    expect(await saved()).toEqual({ ...imported, rotation: -90 });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await saved()).toEqual(imported);
    expect((await displayed()).rotation).toBe(-90);
    await page.mouse.click(stage.x + 193, stage.y + 222);
    const beforeDisplay = await displayed();
    await page.mouse.move(stage.x + 59.6, stage.y + 432.25);
    await page.mouse.down();
    await page.mouse.move(stage.x + 110, stage.y + 432.25);
    expect((await displayed()).scale).toBeGreaterThan(1.7);
    expect(await saved()).toEqual(imported);
    await page
      .getByLabel('Part scale', { exact: true })
      .dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    expect(await saved()).toEqual(imported);
    expect(await displayed()).toEqual(beforeDisplay);

    await page.mouse.move(stage.x + 239.5, stage.y + 432.25);
    await page.mouse.down();
    // The imported fractional handle has its own Point roundtrip. Clamp it past
    // the right edge first, then use the measured endpoint→midpoint gesture.
    await page.mouse.move(stage.x + 269, stage.y + 432.25);
    await page.mouse.up();
    expect((await saved()).rotation).toBe(0);
    await page.mouse.move(stage.x + 268, stage.y + 432.25);
    await page.mouse.down();
    await page.mouse.move(stage.x + 211, stage.y + 432.25);
    await page.mouse.up();
    expect((await saved()).rotation).toBe(180);
    await page.getByRole('button', { name: 'Align to Center', exact: true }).click();
    const center = await displayed(),
      x = stage.x + 185.95 + center.x,
      y = stage.y + 231.7;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 1, y);
    await page.mouse.move(x + 2, y + 6);
    await page.mouse.up();
    const twins = (await readCreatorDesign(page)).parts;
    expect(twins.map((part) => part.rotation)).toEqual([180, 180]);
    expect(twins[0].twin).toBe(twins[1].key);
    expect(twins[1].twin).toBe(twins[0].key);
  });
