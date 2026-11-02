import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} viewer artwork components retain stage jobs, field transforms and button states`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-art-components');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage'),
      size = page.getByLabel('Sized tank'),
      animation = page.getByLabel('Animated tank');
    await expect(stage).toHaveAttribute('data-viewer-subscriptions', '1');
    const pixels = (canvas: typeof size) =>
      canvas.evaluate((node) => {
        const c = node as HTMLCanvasElement,
          data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let left = c.width,
          right = -1,
          ink = 0,
          hash = 2166136261,
          alphaHash = 2166136261;
        for (let i = 0; i < data.length; i++) {
          hash = Math.imul(hash ^ data[i], 16777619);
          if (i % 4 === 3) alphaHash = Math.imul(alphaHash ^ data[i], 16777619);
          if (i % 4 === 3 && data[i] > 8) {
            const x = Math.floor(i / 4) % c.width;
            left = Math.min(left, x);
            right = Math.max(right, x);
            ink++;
          }
        }
        return {
          ink,
          hash: hash >>> 0,
          alphaHash: alphaHash >>> 0,
          width: Math.max(0, right - left + 1) / 2,
        };
      });
    await expect.poll(async () => (await pixels(size)).ink).toBeGreaterThan(0);
    const fitted = await pixels(size),
      first = await pixels(animation);
    expect(fitted.width).toBeLessThan(170);
    const initialImage = await animation.evaluate((node) =>
      (node as HTMLCanvasElement).toDataURL(),
    );
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    const delta = await animation.evaluate(async (node, url) => {
      const canvas = node as HTMLCanvasElement,
        before = document.createElement('canvas');
      before.width = canvas.width;
      before.height = canvas.height;
      const image = new Image();
      image.src = url;
      await image.decode();
      before.getContext('2d')!.drawImage(image, 0, 0);
      const a = before.getContext('2d')!.getImageData(0, 0, before.width, before.height).data,
        b = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0,
        max = 0,
        alpha = 0;
      for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i]) {
          count++;
          max = Math.max(max, Math.abs(a[i] - b[i]));
          if (i % 4 === 3) alpha = Math.max(alpha, Math.abs(a[i] - b[i]));
        }
      return { count, max, alpha };
    }, initialImage);
    writeFileSync(testInfo.outputPath('held-delta.json'), JSON.stringify(delta));
    const held = await pixels(animation);
    expect(held.alphaHash).toBe(first.alphaHash);
    expect(held.ink).toBe(first.ink);
    expect(held.width).toBe(first.width);
    expect(delta.alpha).toBe(0);
    expect(delta.max).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: 'Advance twenty frames', exact: true }).click();
    expect((await pixels(animation)).alphaHash).not.toBe(first.alphaHash);
    await page.getByRole('button', { name: 'Toggle fit', exact: true }).click();
    await expect(page.locator('[data-viewer-components]')).toHaveAttribute('data-fit', 'false');
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    expect((await pixels(size)).width).toBeGreaterThan(fitted.width * 2);
    await page.getByRole('button', { name: 'Toggle fit', exact: true }).click();
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    expect(await pixels(size)).toEqual(fitted);
    await page.getByRole('button', { name: 'Replace animated job', exact: true }).click();
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    expect((await pixels(animation)).ink).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Toggle animated job', exact: true }).click();
    await expect(animation).toHaveCount(0);
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    expect(await pixels(size)).toEqual(fitted);
    await page.getByRole('button', { name: 'Toggle animated job', exact: true }).click();
    await expect(animation).toBeVisible();
    await page.getByRole('button', { name: 'Redraw held frame', exact: true }).click();
    expect((await pixels(animation)).ink).toBeGreaterThan(0);
    await expect(stage).toHaveAttribute('data-viewer-subscriptions', '1');
    await expect(stage.locator('[data-creator-field="largeName_txt"]').first()).toContainText(
      'Fitted tank',
    );
    await expect(stage.locator('[data-creator-field="largeAuthor_txt"]').first()).toHaveCSS(
      'opacity',
      ((0.35 * 253) / 255).toFixed(6),
    );
    const next = page.getByRole('button', { name: 'Next tank', exact: true });
    const box = (await next.boundingBox())!,
      host = (await stage.boundingBox())!;
    expect(box.x - host.x).toBeCloseTo(228, 1);
    expect(box.y - host.y).toBeCloseTo(394.7, 1);
    expect(box.width).toBeCloseTo(101.45, 1);
    const art = () =>
      next
        .locator('img, svg')
        .first()
        .evaluate((node) =>
          node.tagName.toLowerCase() === 'img' ? node.getAttribute('src') : node.innerHTML,
        );
    await page.mouse.move(0, 0);
    const idle = await art();
    await next.focus();
    await expect(page.getByLabel('Hover description')).toHaveText('Next tank');
    expect(await art()).not.toBe(idle);
    await next.press('Enter');
    await expect(page.getByLabel('Button clicks')).toHaveText('1');
    await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
    await expect(next).toBeDisabled();
    await expect(page.getByLabel('Hover description')).toHaveText('');
    const disabled = await art();
    await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle done', exact: true }).click();
    await expect(next).toBeDisabled();
    expect(await art()).toBe(disabled);
    await stage.screenshot({ path: testInfo.outputPath('viewer-components.png') });
    await page.getByRole('button', { name: 'Unmount artwork', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-subscriptions', '0');
    await expect(size).toHaveCount(0);
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    await expect(stage).toHaveAttribute('data-viewer-subscriptions', '0');
    expect(errors).toEqual([]);
  });
}
