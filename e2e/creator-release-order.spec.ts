import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import reference from '../tests/fixtures/creator-release-reference.json' with { type: 'json' };
import type { TankDesign, TankPart } from '../src/game/core/types';
import {
  readCreatorDesign,
  readDisplayedCreatorDesign,
  saveCreator,
  dropPreview,
} from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
const snapshot = (dpr: number, name: string): TankPart[] =>
  reference.runs.find((r) => r.dpr === dpr)!.snapshots.find((s) => s.name === name)!.parts;
const numericParts = (parts: TankPart[]) =>
  parts.map((p) => ({
    type: p.type,
    x: p.x,
    y: p.y,
    rotation: p.rotation,
    scale: p.scale,
    radius: p.radius,
    twin: parts.findIndex((t) => t.key === p.twin),
  }));
async function openCreator(page: Page, native: boolean, parts: TankPart[]) {
  await page.goto('/');
  if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  else await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await page.getByLabel('Import tank design').setInputFiles({
    name: 'release-order.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...starter,
        id: 'release-order',
        name: 'Release order',
        avatar: false,
        sourceCode: undefined,
        parts,
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
  const move = (x: number, y: number) => page.mouse.move(stage.x + x, stage.y + y);
  const marquee = async (outside = false) => {
    await page.mouse.click(stage.x + 275.95, stage.y + 231.7);
    await move(105.95, 181.7);
    await page.mouse.down();
    await page.mouse.move(
      stage.x + (outside ? 405.95 : 185.95),
      stage.y + (outside ? 351.7 : 281.7),
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
  };
  return { stage, move, marquee };
}
async function savedParts(page: Page) {
  await saveCreator(page, { name: 'Release reference', exit: false });
  const dialog = page.getByRole('dialog', { name: 'Tank saved', exact: true });
  const code = await dialog
    .getByRole('textbox', { name: 'Saved tank code', exact: true })
    .inputValue();
  const parts: TankPart[] = JSON.parse(
    execFileSync(
      'bun',
      [
        '-e',
        "import {decodeTankCode} from './src/game/services/tank-code';console.log(JSON.stringify((await decodeTankCode(await Bun.stdin.text())).parts));",
      ],
      { input: code, encoding: 'utf8' },
    ),
  );
  await dialog.getByRole('button', { name: 'Return to editing', exact: true }).click();
  return parts;
}
for (const dpr of [1, 2])
  test.describe(`creator release DPR${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr, viewport: { width: 1100, height: 1000 } });
    for (const native of [false, true]) {
      for (const control of ['rotation', 'scale'] as const)
        for (const outside of [false, true])
          test(`${native ? 'SWF' : 'mock'} ${outside ? 'outside' : 'inside'} marquee ${control} release and click recovery match original codes`, async ({
            page,
          }) => {
            test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
            const errors: string[] = [];
            page.on('pageerror', (error) => errors.push(error.message));
            const { stage, move, marquee } = await openCreator(
              page,
              native,
              snapshot(dpr, 'placed-pair'),
            );
            await marquee(outside);
            const before = await readCreatorDesign(page);
            await move(control === 'rotation' ? 154 : 52, 432.25);
            await page.mouse.down();
            await move(control === 'rotation' ? 239.5 : 91.5, 432.25);
            const held = await readDisplayedCreatorDesign(page);
            expect(held.parts.map((p) => p[control])).not.toEqual(
              before.parts.map((p) => p[control]),
            );
            expect((await readCreatorDesign(page)).parts).toEqual(before.parts);
            await page.mouse.up();
            const unchanged = snapshot(dpr, `${outside ? 'outside' : 'inside'}-${control}`);
            expect(numericParts((await readCreatorDesign(page)).parts)).toEqual(
              numericParts(unchanged),
            );
            expect((await readDisplayedCreatorDesign(page)).parts).toEqual(held.parts);
            await expect(page.getByText('Selected parts (2)', { exact: true })).toBeHidden();
            expect(numericParts(await savedParts(page))).toEqual(numericParts(unchanged));
            // A genuine workspace click consumes the retained flag and selects the pair.
            await page.mouse.click(stage.x + 145.95, stage.y + 221.7);
            await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
            await move(control === 'rotation' ? 211 : 91.5, 432.25);
            await page.mouse.down();
            await move(control === 'rotation' ? 182.5 : 128, 432.25);
            await page.mouse.up();
            const expected = snapshot(dpr, `click-reset-${control}`);
            expect(numericParts((await readCreatorDesign(page)).parts)).toEqual(
              numericParts(expected),
            );
            await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
            expect(numericParts(await savedParts(page))).toEqual(numericParts(expected));
            await page.screenshot({
              path: `test-results/${native ? 'SWF' : 'mock'}-marquee-${control}-${outside ? 'outside' : 'inside'}-DPR${dpr}.png`,
            });
            expect(errors).toEqual([]);
          });
      test(`${native ? 'SWF' : 'mock'} target mouse-up, stage release, layering click and palette rebind match original order`, async ({
        page,
      }) => {
        test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const { stage, marquee } = await openCreator(
          page,
          native,
          snapshot(dpr, 'drag-reset-zero'),
        );
        const equal = async (name: string) =>
          expect(numericParts((await readCreatorDesign(page)).parts)).toEqual(
            numericParts(snapshot(dpr, name)),
          );
        await marquee();
        await page.getByRole('button', { name: 'Align to Center', exact: true }).click();
        await equal('marquee-center');
        await expect(page.getByText('Selected parts (2)', { exact: true })).toBeHidden();
        await marquee();
        await dropPreview(page, 40, -10);
        await equal('marquee-placement');
        await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
        // Palette drag reattaches the workspace listener with its marquee flag clear.
        await page.getByRole('button', { name: 'To front', exact: true }).click();
        await equal('click-front');
        await page.getByRole('button', { name: 'To back', exact: true }).click();
        await equal('marquee-placement');
        await marquee();
        await page.getByRole('button', { name: 'To front', exact: true }).click();
        await equal('marquee-front');
        await expect(page.getByText('Selected parts (2)', { exact: true })).toBeHidden();
        await page.mouse.click(stage.x + 150.95, stage.y + 221.7);
        await page.getByRole('button', { name: 'To front', exact: true }).click();
        await equal('click-front');
        await marquee();
        await page.getByRole('button', { name: 'Delete selected part', exact: true }).click();
        await equal('marquee-delete');
        expect(numericParts(await savedParts(page))).toEqual(
          numericParts(snapshot(dpr, 'marquee-delete')),
        );
        expect(errors).toEqual([]);
      });
    }
  });
