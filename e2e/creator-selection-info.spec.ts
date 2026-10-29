import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import type { TankDesign, TankPart } from '../src/game/core/types';
const base: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const part = (key: string, type: number, x: number, y: number): TankPart => ({
  key,
  type,
  x,
  y,
  radius: 7,
  rotation: 0,
  scale: 1,
  twin: '',
});
const seed: TankDesign = {
  ...base,
  avatar: false,
  id: 'info-fixture',
  name: 'Information fixture',
  parts: [
    part('body', 1001, -80, 40),
    part('first', 4001, -35, -25),
    part('second', 4001, -35, 25),
    part('behavior', 6003, 45, 35),
  ],
};
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} selected-part icons retain outline anchors, popup lifetime and numerical costs`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'info.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(seed)),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const canvas = page.locator('.creator-workspace canvas'),
      box = (await canvas.boundingBox())!,
      at = (x: number, y: number) => ({
        x: box.x + ((x + 175) * box.width) / 350,
        y: box.y + ((y + 175) * box.height) / 350,
      });
    const click = async (x: number, y: number) => {
      const p = at(x, y);
      await page.mouse.click(p.x, p.y);
    };
    await click(-80, 40);
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(0);
    await click(-35, -25);
    const icon = page.locator('.creator-weapon-info-icon[data-part-key="first"]');
    await expect(icon).toBeVisible();
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(1);
    const original = (await icon.boundingBox())!,
      scale = box.width / 350;
    expect(original.width / scale).toBeCloseTo(14.05, 1);
    expect(original.height / scale).toBeCloseTo(15, 1);
    const hash = () =>
      canvas.evaluate((c: HTMLCanvasElement) => {
        let h = 2166136261;
        for (const v of c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data)
          h = Math.imul(h ^ v, 16777619);
        return h >>> 0;
      });
    const before = await hash();
    await expect.poll(hash).not.toBe(before);
    expect(await icon.boundingBox()).toEqual(original);
    await icon.hover();
    const popup = page.getByRole('tooltip', { name: 'Basic Cannon selection info' });
    await expect(popup).toBeVisible();
    await expect(popup.locator('[data-creator-field="gunPoints_txt"] .sr-only')).toHaveText('1');
    await expect(popup.locator('[data-creator-field="bubblePoints_txt"] .sr-only')).toHaveText('2');
    const pb = (await popup.boundingBox())!;
    await page.mouse.move(pb.x + 70 * scale, pb.y + 30 * scale);
    await expect(popup).toBeVisible();
    await page.mouse.click(pb.x + 70 * scale, pb.y + 30 * scale);
    await expect(popup).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Selected parts (2)');
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-selection-info.png` });
    const away = at(130, 120);
    await page.mouse.move(away.x, away.y);
    await expect(popup).toHaveCount(0);
    await icon.focus();
    await expect(popup).toBeVisible();
    await icon.press('Escape');
    await expect(popup).toHaveCount(0);
    await icon.press('Enter');
    await expect(popup).toBeVisible();
    await page.getByRole('button', { name: 'Export', exact: true }).focus();
    await expect(popup).toHaveCount(0);
    const range = page.getByLabel('Part scale'),
      r = (await range.boundingBox())!,
      factor = r.width / 138;
    await page.mouse.move(r.x + (69 - 19) * factor, r.y + (12 + 2.25) * factor);
    await page.mouse.down();
    await page.mouse.move(r.x + (69 + 40) * factor, r.y + (12 + 2.25) * factor, { steps: 8 });
    expect(await icon.boundingBox()).toEqual(original);
    await page.mouse.up();
    await expect
      .poll(async () => (await icon.boundingBox())!.x)
      .toBeGreaterThan(original.x + 5 * scale);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(0);
    // Marquee selection uses the stored radius and includes the moving behavior module.
    const from = at(25, 15),
      to = at(70, 60);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    const behavior = page.getByRole('button', { name: 'Info for Skittish', exact: true });
    await expect(behavior).toBeVisible();
    await behavior.hover();
    const bp = page.getByRole('tooltip', { name: 'Skittish selection info' });
    await expect(bp.locator('[data-creator-field="bubblePoints_txt"] .sr-only')).toHaveText('2');
    await expect(bp.locator('[data-creator-field="gunPoints_txt"] .sr-only')).toHaveText('0');
    await page.mouse.move(away.x, away.y);
    const groupStart = at(-60, -50),
      groupEnd = at(-15, 45);
    await page.mouse.move(groupStart.x, groupStart.y);
    await page.mouse.down();
    await page.mouse.move(groupEnd.x, groupEnd.y, { steps: 8 });
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(1);
    await page.mouse.up();
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(3);
    await page.getByLabel('Symmetric Mode').uncheck();
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(0);
    await expect(bp).toHaveCount(0);
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Enemy statistics' })).toBeVisible();
    await click(130, 120);
    await expect(page.getByRole('button', { name: 'Enemy Info', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
