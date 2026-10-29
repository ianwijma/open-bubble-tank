import { test, expect, type Locator } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import type { PartDefinition } from '../src/game/core/types';
const PARTS: PartDefinition[] = JSON.parse(
  readFileSync(resolve('src/game/data/parts.json'), 'utf8'),
);
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const hash = (canvas: Locator) =>
  canvas.evaluate((node: HTMLCanvasElement) => {
    const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data;
    let h = 2166136261;
    for (const v of data) h = Math.imul(h ^ v, 16777619);
    return h >>> 0;
  });
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator rollovers show source text, row arrows and independent animated thumbnails`, async ({
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
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    const carrier = page.getByRole('button', { name: 'Place Seeker Carrier', exact: true });
    await carrier.hover();
    const tooltip = page.getByRole('tooltip', { name: 'Seeker Carrier details' }),
      thumb = tooltip.locator('canvas');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('[data-creator-field="flavor_txt"]')).toContainText(
      `We've always wondered`,
    );
    await expect(tooltip.locator('[data-creator-field="flavor_txt"]')).not.toContainText('\\');
    await expect(tooltip.locator('[data-details-arrow]')).toHaveAttribute(
      'data-details-arrow',
      '1',
    );
    const stage = (await page.locator('.creator').boundingBox())!,
      p = (await tooltip.boundingBox())!,
      scale = stage.width / 550;
    expect((p.x - stage.x) / scale).toBeCloseTo(189, 1);
    expect((p.y - stage.y) / scale).toBeCloseTo(253, 1);
    await expect
      .poll(() =>
        thumb.evaluate((node: HTMLCanvasElement) => {
          const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data;
          let min = node.width,
            max = 0;
          for (let y = 0; y < node.height; y++)
            for (let x = 0; x < node.width; x++)
              if (data[(y * node.width + x) * 4 + 3] > 100) {
                min = Math.min(min, x);
                max = Math.max(max, x);
              }
          return max - min;
        }),
      )
      .toBeGreaterThan(88);
    const before = Number(await tooltip.getAttribute('data-instance'));
    await carrier.click();
    await expect(tooltip.locator('[data-details-arrow]')).toHaveAttribute(
      'data-details-arrow',
      '2',
    );
    expect(Number(await tooltip.getAttribute('data-instance'))).toBeGreaterThan(before);
    await expect
      .poll(() =>
        page.locator('.creator-part-preview canvas').evaluate((node: HTMLCanvasElement) => {
          const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data;
          let min = node.width,
            max = 0;
          for (let y = 0; y < node.height; y++)
            for (let x = 0; x < node.width; x++)
              if (data[(y * node.width + x) * 4 + 3] > 100) {
                min = Math.min(min, x);
                max = Math.max(max, x);
              }
          return max - min;
        }),
      )
      .toBeGreaterThan(140);
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-details.png` });
    const seekers = page.getByRole('button', { name: 'Place Seekers', exact: true });
    await seekers.hover();
    const seekId = PARTS.find((p) => p.name === 'Seekers' && Math.floor(p.id / 1000) === 4)!.id,
      animated = page.getByRole('tooltip', { name: 'Seekers details' });
    await expect(animated).toHaveAttribute('data-part', String(seekId));
    await expect(animated.locator('[data-details-arrow]')).toHaveCSS('opacity', '0.4');
    const first = await hash(animated.locator('canvas'));
    await expect.poll(() => hash(animated.locator('canvas'))).not.toBe(first);
    await page.getByRole('button', { name: 'Behavior', exact: true }).click();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.getByRole('button', { name: 'Place Skittish', exact: true }).focus();
    const skittish = page.getByRole('tooltip', { name: 'Skittish details' });
    await expect(skittish).toBeVisible();
    const skit = await hash(skittish.locator('canvas'));
    await expect.poll(() => hash(skittish.locator('canvas'))).not.toBe(skit);
    await page.getByRole('button', { name: 'Enemy Info', exact: true }).focus();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
