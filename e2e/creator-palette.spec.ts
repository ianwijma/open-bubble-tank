import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator palette uses source scrolling and unclamped clipped previews`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Provide the reference SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    const creator = page.locator('.creator'),
      port = page.locator('.part-palette'),
      preview = page.locator('.creator-part-preview'),
      scroll = page.getByRole('scrollbar', { name: 'Scroll parts' });
    const stage = (await creator.boundingBox())!,
      factor = stage.width / 550;
    const pb = (await preview.boundingBox())!;
    expect((pb.x - stage.x) / factor).toBeCloseTo(398, 1);
    expect((pb.y - stage.y) / factor).toBeCloseTo(179.05, 1);
    expect(pb.width / factor).toBeCloseTo(141, 1);
    expect(pb.height / factor).toBeCloseTo(67, 1);
    expect(await port.locator('[data-creator-field="cost_txt"]').count()).toBe(0);
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    const carrier = page.getByRole('button', { name: 'Place Seeker Carrier', exact: true });
    await carrier.click();
    await expect(carrier).toHaveAttribute('data-row-frame', '3');
    await expect(
      page.getByRole('button', { name: 'Drag Seeker Carrier into design', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        preview.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
          const ctx = canvas.getContext('2d')!,
            { width, height } = canvas,
            data = ctx.getImageData(0, 0, width, height).data;
          let min = width,
            max = 0,
            edge = 0;
          for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++)
              if (data[(y * width + x) * 4 + 3] > 100) {
                min = Math.min(min, x);
                max = Math.max(max, x);
                if (y < 2 || y > height - 3) edge++;
              }
          return max - min > 140 && edge > 30;
        }),
      )
      .toBe(true);
    const down = page.getByRole('button', { name: 'Scroll parts down', exact: true });
    await down.click();
    expect(await port.evaluate((n) => n.scrollTop)).toBeGreaterThanOrEqual(20);
    expect(Number(await scroll.getAttribute('aria-valuenow'))).toBeGreaterThan(20);
    await scroll.press('End');
    await expect(
      page.getByRole('button', { name: 'Place Spin-Fire', exact: true }),
    ).toBeInViewport();
    await scroll.press('Home');
    expect(await port.evaluate((n) => n.scrollTop)).toBe(0);
    const bar = (await scroll.boundingBox())!;
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2 + 60 * factor, {
      steps: 6,
    });
    await page.mouse.up();
    expect(await port.evaluate((n) => n.scrollTop)).toBeGreaterThan(120);
    await port.hover();
    const before = await port.evaluate((n) => n.scrollTop);
    await page.mouse.wheel(0, -100);
    await expect.poll(() => port.evaluate((n) => n.scrollTop)).toBeLessThan(before);
    await page.getByRole('button', { name: 'Behavior', exact: true }).click();
    await expect(scroll).toHaveAttribute('aria-disabled', 'true');
    await expect(down).toBeDisabled();
    expect(await port.evaluate((n) => n.scrollTop)).toBe(0);
    await expect(creator.locator('[data-creator-field="PrimarySecondary_txt"]')).toContainText(
      'Behavior Weapons:',
    );
    if (native) {
      await expect(page.locator('.palette-tabs button img')).toHaveCount(3);
      await expect(carrier).toHaveCount(0);
      await expect(creator.locator('[data-creator-field="name_txt"] img').first()).toBeVisible();
    }
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await carrier.click();
    await page.mouse.move(stage.x + factor * 100, stage.y + factor * 100);
    await creator.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-creator-palette.png`,
    });
    expect(errors).toEqual([]);
  });
