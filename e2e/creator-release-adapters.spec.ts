import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import reference from '../tests/fixtures/creator-release-reference.json' with { type: 'json' };
import type { TankDesign, TankPart } from '../src/game/core/types';
import { readCreatorDesign, readDisplayedCreatorDesign } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';
const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
const snapshot = (dpr: number, name: string): TankPart[] =>
  reference.runs.find((run) => run.dpr === dpr)!.snapshots.find((row) => row.name === name)!.parts;

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

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} browser cancellation and keyboard range adapters preserve marquee selection`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const { move, marquee } = await openCreator(page, native, snapshot(1, 'placed-pair'));
    await marquee();
    const saved = await readCreatorDesign(page),
      displayed = await readDisplayedCreatorDesign(page);
    const scale = page.getByRole('slider', { name: 'Part scale', exact: true });
    await move(52, 432.25);
    await page.mouse.down();
    await move(91.5, 432.25);
    await scale.dispatchEvent('pointercancel', {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      buttons: 1,
    });
    await page.mouse.up();
    expect((await readCreatorDesign(page)).parts).toEqual(saved.parts);
    expect((await readDisplayedCreatorDesign(page)).parts).toEqual(displayed.parts);
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
    // Cancel did not consume the source flag; a later actual release still does.
    await move(52, 432.25);
    await page.mouse.down();
    await move(91.5, 432.25);
    await page.mouse.up();
    expect((await readCreatorDesign(page)).parts).toEqual(saved.parts);
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeHidden();
    await marquee();
    await page.getByRole('slider', { name: 'Part scale', exact: true }).fill('1.25');
    expect((await readCreatorDesign(page)).parts.map((part) => part.scale)).toEqual([1.25, 1.25]);
    await page.getByRole('button', { name: 'To front', exact: true }).click();
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} accepted center no-op after marquee retains its original Undo entry`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const { stage, move, marquee } = await openCreator(page, native, snapshot(1, 'placed-pair'));
    await page.mouse.click(stage.x + 145.95, stage.y + 221.7);
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
    await move(154, 432.25);
    await page.mouse.down();
    await move(182.5, 432.25);
    await page.mouse.up();
    const rotated = (await readCreatorDesign(page)).parts;
    expect(rotated.map((part) => part.rotation)).toEqual(
      snapshot(1, 'click-reset-rotation').map((part) => part.rotation),
    );
    await marquee();
    await page.getByRole('button', { name: 'Align to Center', exact: true }).click();
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeHidden();
    expect((await readCreatorDesign(page)).parts).toEqual(rotated);
    // Original public Save/Copy after this Undo still contains the rotated pair:
    // the accepted center CLICK adds a snapshot even though stage release emptied selection.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toEqual(rotated);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toEqual(snapshot(1, 'placed-pair'));
  });
