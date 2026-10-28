import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} pause captures once, holds through settings and Info, and reverses its bitmap history`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('pause-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage'),
      bitmap = page.locator('.pause-bitmap');
    expect(JSON.parse((await stage.getAttribute('data-capture-layers'))!)).toEqual({
      early: true,
      combined: [128, 0, 127, 255],
      base: [0, 0, 255, 255],
      released: true,
    });
    await expect(bitmap).toHaveAttribute('data-ready', 'true');
    const node = await bitmap.elementHandle();
    const pixels = () => bitmap.evaluate((canvas) => (canvas as HTMLCanvasElement).toDataURL());
    const advance = (count: number) =>
      page
        .getByRole('button', { name: `Advance${count} frames`, exact: true })
        .dispatchEvent('click');
    const inspect = () =>
      page.getByRole('button', { name: 'Inspect live scene', exact: true }).dispatchEvent('click');
    const initial = await pixels();
    await inspect();
    const source = await stage.getAttribute('data-source-hash');
    await advance(20);
    await expect(bitmap).toHaveAttribute('data-saved-frames', '10');
    expect(await pixels()).not.toBe(initial);
    await advance(20);
    await expect(bitmap).toHaveAttribute('data-saved-frames', '19');
    const blurred = await pixels();
    expect(Number(await bitmap.getAttribute('data-retained-bytes'))).toBe(550 * 450 * 4 * 21);
    await advance(5);
    await inspect();
    expect(await stage.getAttribute('data-source-hash')).not.toBe(source);
    expect(await pixels()).toBe(blurred);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(settings).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(page.locator('.pause-bitmap-scrim')).toHaveAttribute('inert', '');
    expect(
      await settings.evaluate((node) => getComputedStyle(node.parentElement!).backdropFilter),
    ).toBe('none');
    await advance(100);
    await expect(bitmap).toHaveAttribute('data-capture-count', '1');
    expect(await pixels()).toBe(blurred);
    expect(await bitmap.evaluate((current, original) => current === original, node)).toBe(true);
    await settings.getByRole('button', { name: 'DONE', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeFocused();
    await advance(100);
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    await advance(100);
    expect(await pixels()).toBe(blurred);
    await page.getByRole('button', { name: 'BACK', exact: true }).click();
    await advance(100);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pause-bitmap-open.png` });
    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
    await advance(1);
    expect(await pixels()).toBe(blurred); // The next unused history slot is transparent.
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(5);
    expect(await pixels()).not.toBe(blurred);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pause-bitmap-return.png` });
    await advance(1);
    await advance(1);
    await advance(1);
    expect(await pixels()).toBe(initial); // Closing frame39 restores saved opaque frame0.
    await expect(stage).toHaveAttribute('data-world-mode', 'paused');
    await advance(1);
    await advance(1);
    await expect(stage).toHaveAttribute('data-world-mode', 'playing');
    await expect(bitmap).toHaveCount(0);
    expect(
      await node!.evaluate((canvas) => ({
        width: (canvas as HTMLCanvasElement).width,
        bytes: canvas.getAttribute('data-retained-bytes'),
      })),
    ).toEqual({ width: 0, bytes: '0' });
    expect(errors).toEqual([]);
  });
