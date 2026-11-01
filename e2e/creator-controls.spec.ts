import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview } from './helpers/creator';
import type { TankDesign } from '../src/game/core/types';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator shows original controls, merges centered twins and commits one undo per slider gesture`, async ({
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
    const creator = page.locator('.creator'),
      canvas = page.locator('.creator-workspace canvas');
    await expect(page.getByRole('button', { name: 'Align to Center', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await dropPreview(page, -20, -25);
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + (155 * box.width) / 350, box.y + (150 * box.height) / 350);
    await expect(page.getByRole('status')).toContainText('Selected parts (2)');
    await expect(page.getByLabel('Part scale')).toBeVisible();
    await expect(page.getByLabel('Part rotation')).toBeVisible();
    const snapshot = async (keepPointer = false): Promise<TankDesign> => {
      const downloading = page.waitForEvent('download');
      const button = page.getByRole('button', { name: 'Export', exact: true });
      if (keepPointer) await button.evaluate((node) => (node as HTMLButtonElement).click());
      else await button.click();
      return JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'));
    };
    const before = await snapshot();
    const slider = page.locator('[data-creator-slider="Resize_mc"]'),
      r = await slider.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.x, y: r.y };
      });
    const factor = box.width / 350;
    // Source scale1 maps to -19 on the -57..57 track; track clicks outside the handle do nothing.
    await page.mouse.click(r.x + 40 * factor, r.y + 2.25 * factor);
    expect((await snapshot()).parts.map((p) => p.scale)).toEqual(before.parts.map((p) => p.scale));
    await page.mouse.move(r.x - 19 * factor, r.y + 2.25 * factor);
    // Hover grows the original handle's transparent hit circle from radius9 to11.9.
    await page.mouse.move(r.x - 29.5 * factor, r.y + 2.25 * factor);
    await page.mouse.down();
    await page.mouse.move(r.x + 30 * factor, r.y + 2.25 * factor, { steps: 8 });
    await page.mouse.up();
    const resized = await snapshot();
    expect(resized.parts.every((p) => p.scale > 1.6)).toBe(true);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot()).parts.map((p) => p.scale)).toEqual(before.parts.map((p) => p.scale));
    await page.mouse.click(box.x + (155 * box.width) / 350, box.y + (150 * box.height) / 350);
    await page.mouse.click(r.x - 19 * factor, r.y + 2.25 * factor);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot()).parts).toHaveLength(0); // A no-op handle press adds no undo state.
    await dropPreview(page, -20, -25);
    await page.mouse.click(box.x + (155 * box.width) / 350, box.y + (150 * box.height) / 350);
    const right = page.getByRole('button', { name: 'Move selection right', exact: true });
    await right.press('Enter');
    expect((await snapshot()).parts.every((p) => p.x === -19)).toBe(true);
    const rb = (await right.boundingBox())!;
    await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await page.mouse.down();
    // Export through its public action without moving the pointer off the held control.
    await expect.poll(async () => (await snapshot(true)).parts.every((p) => p.x > -19)).toBe(true);
    await page.mouse.up();
    expect((await snapshot()).parts.every((p) => p.x > -18)).toBe(true);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot()).parts.every((p) => p.x === -19)).toBe(true);
    await page.mouse.click(box.x + (156 * box.width) / 350, box.y + (150 * box.height) / 350);
    await page.getByRole('button', { name: 'Align to Center', exact: true }).click();
    const centered = await snapshot();
    expect(centered.parts).toHaveLength(1);
    expect(centered.parts[0]).toMatchObject({ x: -19, y: 0, twin: '' });
    if (native) {
      for (const name of ['SymmetricMode_mc', 'SaveExit_mc', 'DeleteButton_mc', 'Undo_mc'])
        await expect(creator.locator(`[data-creator-control="${name}"] img`)).toBeVisible();
      for (const name of ['Resize_mc', 'Rotate_mc']) {
        const images = creator.locator(`[data-creator-slider="${name}"] img`);
        await expect(images).toHaveCount(2);
        for (const image of await images.all())
          expect((await image.boundingBox())!.width).toBeGreaterThan(10);
      }
    }
    await creator.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-creator-controls.png`,
    });
    expect(errors).toEqual([]);
  });
