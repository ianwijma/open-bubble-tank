import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} series strip reveals in source order, reverses in flight and keeps links offline`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [],
      remote: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname))
        remote.push(request.url());
    });
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('main-menu');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const menu = page.locator('.main-menu'),
      series = page.locator('.main-menu-series');
    await expect(menu).toHaveAttribute('data-menu-age', '0', { timeout: 60000 });
    await expect(series).toHaveAttribute('inert', '');
    const advance = async (count: number) => {
      // Keep the real pointer over the series strip while advancing the external fixture clock.
      await page
        .getByRole('button', { name: `Menu advance ${count} frames`, exact: true })
        .evaluate((node) => (node as HTMLButtonElement).click());
    };
    await advance(95);
    await advance(1);
    await advance(100);
    await expect(series).toHaveAttribute('data-series-frame', '1');
    expect(await series.evaluate((node) => node.getBoundingClientRect().width)).toBe(131);
    if (!native) {
      // The source's signed8.8 fade overshoots1: translucent alpha25 becomes26.
      // An unchanged stopped frame must repaint as the parent's alpha changes.
      const alpha = await series
        .locator('canvas')
        .evaluate(
          (canvas) =>
            (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(8, 22, 1, 1).data[3],
        );
      expect(alpha).toBe(26);
    }

    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-series-off.png` });
    await series.hover();
    await expect(series).toHaveAttribute('data-series-frame', '2');
    await expect(page.locator('.menu-series-caption')).toHaveCSS('letter-spacing', 'normal');
    await expect(page.locator('.menu-series-caption')).toHaveCSS('opacity', '1');
    await advance(1);
    await advance(1);
    await expect(series).toHaveAttribute('data-series-frame', '4');
    await expect(series.getByRole('button')).toHaveCount(1);
    await advance(1);
    await advance(1);
    await expect(series).toHaveAttribute('data-series-frame', '6');
    await expect(series.getByRole('button')).toHaveCount(2);
    const box = (await series.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y - 5);
    await expect(series).toHaveAttribute('data-series-frame', '15');
    await advance(1);
    await advance(1);
    await expect(series).toHaveAttribute('data-series-frame', '17');
    await series.hover();
    await expect(series).toHaveAttribute('data-series-frame', '4');
    await advance(1);
    await advance(1);
    await advance(1);
    await advance(1);
    await expect(series).toHaveAttribute('data-series-frame', '8');
    await expect(series.getByRole('button')).toHaveCount(3);
    await advance(20);
    await expect(series).toHaveAttribute('data-series-frame', '10');
    await expect(series.getByRole('button')).toHaveCount(4);
    expect(await series.evaluate((node) => node.getBoundingClientRect().width)).toBe(401);
    await series.evaluate((node) => node.setAttribute('data-retained-proof', 'original'));
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-series-on.png` });
    await series.getByRole('button', { name: 'Bubble Tanks', exact: true }).hover();
    await expect(page.locator('.menu-series-caption')).toContainText('Bubble Tanks');
    await page.mouse.move(box.x + 20, box.y + 11);
    await expect(page.locator('.menu-series-caption')).toContainText('More Bubbletanks Games');
    await expect(series).toHaveAttribute('data-series-frame', '10');
    await page.mouse.click(box.x + 20, box.y + 11);
    await expect(page.locator('.menu-series-caption')).toHaveText('');
    for (const name of [
      'Bubble Tanks',
      'Bubble Tanks 2',
      'Bubble Tanks Arenas',
      'Bubble Tanks Tower Defense 1.5',
    ]) {
      await series.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.menu-series-caption')).toContainText('not connected');
    }
    expect(page.context().pages()).toHaveLength(1);
    expect(remote).toEqual([]);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(1);
    await expect(series).toHaveAttribute('inert', '');
    expect(await series.evaluate((node) => node.style.left)).toBe('-100px');
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await advance(20);
    await expect(series).toHaveAttribute('data-retained-proof', 'original');
    await expect(series).toHaveAttribute('data-series-frame', '1');
    expect(await series.evaluate((node) => node.style.left)).toBe('5px');
    // The keyboard route reveals the same retained strip and activates its offline adapter.
    await page.getByRole('button', { name: 'Change assets', exact: true }).press('Tab');
    await expect(series).toHaveAttribute('data-series-frame', '2');
    await advance(20);
    await page.keyboard.press('Tab');
    await expect(series.getByRole('button', { name: 'Bubble Tanks', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.menu-series-caption')).toContainText('not connected');
    expect(page.context().pages()).toHaveLength(1);
    expect(remote).toEqual([]);
    expect(errors).toEqual([]);
  });
}
