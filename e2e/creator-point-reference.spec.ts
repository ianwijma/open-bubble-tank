import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import type { TankDesign, TankPart } from '../src/game/core/types';
import reference from '../tests/fixtures/creator-point-reference.json' with { type: 'json' };
import { readCreatorDesign, readDisplayedCreatorDesign, exitCreator } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
const coordinates = (parts: TankPart[]) =>
  parts.map(({ key, twin, x, y }) => ({ key, twin, x, y }));
for (const dpr of [1, 2])
  test.describe(`creator reference DPR${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 2600, height: 2200 } });
    for (const native of [false, true])
      test(`${native ? 'SWF' : 'mock'} public drag exports match five measured original gestures`, async ({
        page,
      }) => {
        test.setTimeout(180000);
        test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('/');
        if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
        else await page.getByRole('button', { name: 'Play with mock assets' }).click();
        await waitForMainMenu(page);
        await page.getByRole('button', { name: 'My tanks', exact: true }).click();
        const examples = reference.drag.filter((row) => row.dpr === dpr);
        for (const [i, row] of examples.entries())
          await page.getByLabel('Import tank design').setInputFiles({
            name: `reference-${i}.json`,
            mimeType: 'application/json',
            buffer: Buffer.from(
              JSON.stringify({
                ...starter,
                id: `reference-${i}`,
                name: `Reference ${i}`,
                avatar: false,
                sourceCode: undefined,
                parts: row.before.map((p) => ({
                  ...p,
                  type: 1001,
                  radius: 7,
                  rotation: 0,
                  scale: 1,
                })),
              }),
            ),
          });
        for (const [i, row] of examples.entries()) {
          await page.getByRole('button', { name: 'Edit', exact: true }).nth(i).click();
          await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
          await page.addStyleTag({
            content: `.stage-frame{position:fixed!important;left:0!important;top:0!important;width:${550 * row.scale}px!important;height:${450 * row.scale}px!important;max-width:none!important}`,
          });
          await expect
            .poll(
              async () => (await page.locator('.creator-workspace canvas').boundingBox())!.width,
            )
            .toBe(350 * row.scale);
          const stage = (await page.locator('.stage-space').boundingBox())!;
          await page.mouse.click(stage.x + row.down.x, stage.y + row.down.y);
          await expect(page.getByRole('status')).toContainText('Selected parts (2)');
          await page.mouse.down();
          for (const move of row.moves) {
            await page.mouse.move(stage.x + move.x, stage.y + move.y);
            await page.waitForTimeout(80);
          }
          expect(coordinates((await readDisplayedCreatorDesign(page)).parts), row.name).toEqual(
            row.expected,
          );
          expect(coordinates((await readCreatorDesign(page)).parts), row.name).toEqual(row.before);
          await page.mouse.up();
          expect(coordinates((await readCreatorDesign(page)).parts), row.name).toEqual(
            row.expected,
          );
          await exitCreator(page);
        }
        expect(errors).toEqual([]);
      });
  });

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} public palette placements match original fractional exports`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 2600, height: 2200 });
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
    let count = 0;
    for (const row of reference.placement) {
      await page.addStyleTag({
        content: `.stage-frame{position:fixed!important;left:0!important;top:0!important;width:${550 * row.scale}px!important;height:${450 * row.scale}px!important;max-width:none!important}`,
      });
      await expect
        .poll(() =>
          page.locator('.stage-space').evaluate((element) => {
            const transform = getComputedStyle(element).transform;
            return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
          }),
        )
        .toBe(row.scale);
      const stage = (await page.locator('.stage-space').boundingBox())!,
        preview = (await page.locator('.creator-part-preview').boundingBox())!;
      await page.mouse.move(preview.x + preview.width / 2, preview.y + preview.height / 2);
      await page.mouse.down();
      await page.mouse.move(stage.x + row.mouse.x, stage.y + row.mouse.y, { steps: 20 });
      await page.mouse.up();
      const parts = (await readCreatorDesign(page)).parts,
        added = parts.slice(count);
      expect(
        added.map(({ x, y }) => ({ x, y })),
        row.name,
      ).toEqual(row.expected.map(({ x, y }) => ({ x, y })));
      if (added.length === 2) {
        expect(added[0].twin).toBe(added[1].key);
        expect(added[1].twin).toBe(added[0].key);
      }
      count = parts.length;
    }
    await page
      .locator('.creator')
      .screenshot({ path: testInfo.outputPath('fractional-placement.png') });
    expect(errors).toEqual([]);
  });
