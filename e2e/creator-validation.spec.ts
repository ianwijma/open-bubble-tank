import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign, TankPart } from '../src/game/core/types';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview, readCreatorDesign } from './helpers/creator';
const starter: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const part = (type: number, key: string, change: Partial<TankPart> = {}): TankPart => ({
  key,
  type,
  twin: '',
  x: 0,
  y: 0,
  radius: 8,
  rotation: 0,
  scale: 1,
  ...change,
});
async function open(page: Page, native: boolean, parts: TankPart[]) {
  await page.goto('/');
  if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
  else await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await page.getByLabel('Import tank design').setInputFiles({
    name: 'validation.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...starter,
        sourceCode: undefined,
        id: 'validation',
        name: 'Validation',
        avatar: false,
        life: 88,
        parts,
      }),
    ),
  });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  // Complete the guide through its real controls before reading the editor's metadata.
  await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
}
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} edit validation rejects symmetric overspend and distinct behaviors without losing stats or history`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, native, [
      part(1001, 'body'),
      ...Array.from({ length: 18 }, (_, i) => part(4001, `gun-${i}`)),
    ]);
    const initial = (await readCreatorDesign(page)).parts;
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await page.getByRole('textbox', { name: 'Enemy life', exact: true }).fill('333');
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await page.getByRole('button', { name: 'Place Basic Cannon', exact: true }).click();
    await dropPreview(page, 45, -20);
    const alert = page.getByRole('alertdialog', { name: 'Tank creator error' });
    await expect(alert).toContainText('Not enough Gun Points!');
    expect((await readCreatorDesign(page)).parts).toEqual(initial);
    expect((await readCreatorDesign(page)).life).toBe(333);
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-editor-overspend.png` });
    await alert.press('Enter');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toHaveLength(0);
    expect((await readCreatorDesign(page)).life).toBe(333);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Body', exact: true }).click();
    await page.getByRole('button', { name: 'Place Small Bubble', exact: true }).click();
    await dropPreview(page, 0, 0);
    await page.getByRole('button', { name: 'Behavior', exact: true }).click();
    await page.getByRole('button', { name: 'Place Aggressor', exact: true }).click();
    await dropPreview(page, 0, -20);
    const accepted = (await readCreatorDesign(page)).parts;
    expect(accepted.filter((p) => p.type === 6001)).toHaveLength(2);
    await page.getByRole('button', { name: 'Place Skittish', exact: true }).click();
    await dropPreview(page, 45, 0);
    await expect(alert).toContainText('You may only place one type of Behavior Part.');
    expect((await readCreatorDesign(page)).parts).toEqual(accepted);
    await alert.press('Enter');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts.map((p) => p.type)).toEqual([1001]);
    expect(errors).toEqual([]);
  });
  test(`${native ? 'SWF' : 'mock'} resize rejection restores pre-click snapshot and accepted no-op/import undo states`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, native, [
      part(1004, 'body', { scale: 2, radius: 40 }),
      part(4002, 'gun', { x: 80 }),
    ]);
    const original = await readCreatorDesign(page);
    expect(original.classId).toBeGreaterThanOrEqual(2);
    const canvas = (await page.locator('.creator-workspace canvas').boundingBox())!;
    await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await expect(page.getByLabel('Part scale')).toBeVisible();
    // One JS task gives a zero-frame pointer gesture: MOUSE_UP snapshot precedes CLICK's +1px.
    await page.locator('[data-creator-control="Right_mc"]').evaluate((element) => {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    });
    expect((await readCreatorDesign(page)).parts.find((p) => p.key === 'body')?.x).toBe(1);
    await page.getByLabel('Part scale').press('Home');
    const alert = page.getByRole('alertdialog', { name: 'Tank creator error' });
    await expect(alert).toContainText('Your parts require a larger class.');
    expect((await readCreatorDesign(page)).parts).toEqual(original.parts);
    const screenshot = await page.locator('.creator').screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-editor-resize-reverted.png`,
    });
    // The source heading must actually paint in DOM, not just exist in a decoded asset.
    const redHeading = await page.evaluate(
      async (bytes) => {
        const image = await createImageBitmap(
            new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
          ),
          canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(
          Math.round((235 * image.width) / 550),
          Math.round((160 * image.height) / 450),
          Math.round((80 * image.width) / 550),
          Math.round((35 * image.height) / 450),
        ).data;
        let red = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i] > 200 && pixels[i + 1] < 100 && pixels[i + 2] < 80) red++;
        image.close();
        return red;
      },
      [...screenshot],
    );
    expect(redHeading).toBeGreaterThan(100);
    await alert.press('Enter');
    await expect(page.getByLabel('Part scale')).toHaveCount(0);
    await expect(page.locator('.creator-workspace canvas')).toBeFocused();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toEqual(original.parts);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await readCreatorDesign(page)).parts).toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
