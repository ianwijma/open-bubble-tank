import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign, TankPart } from '../src/game/core/types';
import { waitForMainMenu } from './helpers/main-menu';
import { exitCreator } from './helpers/creator';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
const part = (key: string, type: number, x: number, y: number, twin = ''): TankPart => ({
  key,
  type,
  x,
  y,
  twin,
  scale: 1,
  rotation: 0,
  radius: 7,
});
const design: TankDesign = {
  ...starter,
  id: 'L10000001',
  name: 'Selection info fixture',
  avatar: false,
  parts: [
    part('body', 1005, -70, 0),
    part('gun', 4001, 50, -40, 'twin'),
    part('twin', 4001, 50, 40, 'gun'),
    part('behavior', 6003, -10, -50),
  ],
};
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} selected weapon icons follow painted outline corners through drag, marquee and nudge`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click();
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'selection.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(design)),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    const canvas = page.locator('.creator-workspace canvas'),
      icons = page.locator('.creator-weapon-info-icon');
    await expect.poll(async () => (await canvas.boundingBox())?.width).toBe(350);
    const at = async (x: number, y: number) => {
      const b = (await canvas.boundingBox())!;
      return { x: b.x + 175 + x, y: b.y + 175 + y };
    };
    const click = async (x: number, y: number) => {
      const p = await at(x, y);
      await page.mouse.click(p.x, p.y);
    };
    await click(-70, 0);
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    await expect(icons).toHaveCount(0);
    await click(50, -40);
    await expect(icons).toHaveCount(2);
    const gun = page.locator('.creator-weapon-info-icon[data-part-key="gun"]');
    // Compare DOM registration with the actual cyan1px stroke in the production canvas.
    const corner = await canvas.evaluate((node) => {
      const c = node as HTMLCanvasElement,
        pixels = c.getContext('2d')!.getImageData(0, 0, 700, 700).data;
      let right = -1,
        top = 700;
      for (let y = 170; y < 340; y++)
        for (let x = 380; x < 550; x++) {
          const i = (y * 700 + x) * 4;
          if (
            pixels[i] < 3 &&
            Math.abs(pixels[i + 1] - 203) < 4 &&
            pixels[i + 2] > 250 &&
            pixels[i + 3] > 40
          ) {
            right = Math.max(right, x);
            top = Math.min(top, y);
          }
        }
      return { right: (right + 1) / 2 - 175, top: top / 2 - 175, found: right >= 0 };
    });
    expect(corner.found).toBe(true);
    const cb = (await canvas.boundingBox())!,
      ib = (await gun.boundingBox())!;
    expect(Math.abs(ib.x - cb.x - 175 - corner.right)).toBeLessThan(0.7);
    expect(Math.abs(ib.y - cb.y - 175 - corner.top)).toBeLessThan(0.7);
    expect(ib.width).toBeCloseTo(14.05, 1);
    expect(ib.height).toBe(15);
    await gun.hover();
    const popup = page.getByRole('tooltip', { name: 'Basic Cannon selection info', exact: true });
    await expect(popup).toBeVisible();
    await expect(popup.locator('[data-creator-field="bubblePoints_txt"] > .sr-only')).toHaveText(
      '2',
    );
    await expect(popup.locator('[data-creator-field="gunPoints_txt"] > .sr-only')).toHaveText('1');
    await page.locator('.creator').screenshot({
      path: testInfo.outputPath(`${native ? 'native' : 'mock'}-selection-info.png`),
    });
    await click(50, -40);
    await expect(popup).toHaveCount(0);
    // Reselect, move the selected group and cancel: icons disappear only during movement.
    await click(50, -40);
    await expect(icons).toHaveCount(2);
    const from = await at(50, -40),
      to = await at(55, -40);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y);
    await expect(icons).toHaveCount(0);
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    await expect(icons).toHaveCount(2);
    const empty = await at(130, 100),
      emptyTo = await at(140, 110);
    await page.mouse.move(empty.x, empty.y);
    await page.mouse.down();
    await page.mouse.move(emptyTo.x, emptyTo.y);
    await expect(icons).toHaveCount(2);
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    const before = (await gun.boundingBox())!;
    await page.getByRole('button', { name: 'Move selection right', exact: true }).click();
    await expect.poll(async () => (await gun.boundingBox())!.x - before.x).toBeCloseTo(1, 1);
    await page.getByRole('button', { name: 'Delete selected part', exact: true }).click();
    await expect(icons).toHaveCount(0);
    await exitCreator(page);
    expect(errors).toEqual([]);
  });

  test(`${native ? 'SWF' : 'mock'} selection popups preserve numeric costs and close on overlay rebuild and keyboard escape`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-selection-info');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const icon = page.getByRole('button', { name: 'Info for Seeker Carrier', exact: true }),
      popup = page.getByRole('tooltip');
    await icon.focus();
    await expect(popup).toHaveAttribute('aria-label', 'Seeker Carrier selection info');
    await expect(popup.locator('[data-creator-field="bubblePoints_txt"] > .sr-only')).toHaveText(
      '4',
    );
    await expect(icon).toHaveAttribute('aria-describedby', (await popup.getAttribute('id'))!);
    const ib = (await icon.boundingBox())!,
      pb = (await popup.boundingBox())!;
    expect(pb.x).toBe(ib.x);
    expect(pb.y).toBe(ib.y);
    expect(pb.width).toBeCloseTo(145.00274658203125, 1);
    expect(pb.height).toBeCloseTo(61.997222900390625, 1);
    await page
      .getByRole('button', { name: 'Rebuild identical selection', exact: true })
      .dispatchEvent('click');
    await expect(icon).toBeFocused();
    await expect(popup).toHaveCount(0);
    await icon.press('Enter');
    await expect(popup).toHaveCount(1);
    await icon.press('Escape');
    await expect(popup).toHaveCount(0);
    const behavior = page.getByRole('button', { name: 'Info for Skittish', exact: true });
    await behavior.hover();
    await expect(popup).toHaveAttribute('aria-label', 'Skittish selection info');
    await popup.hover();
    await page
      .locator('#stage')
      .screenshot({ path: testInfo.outputPath(`${native ? 'native' : 'mock'}-behavior-info.png`) });
    await page.mouse.move(1, 1);
    await expect(popup).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await expect(page.locator('.creator-weapon-info-icon')).toHaveCount(0);
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    await expect(page.locator('.creator-selection-info')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
