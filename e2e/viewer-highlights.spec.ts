import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const layout = JSON.parse(readFileSync('src/game/data/tank-viewer.json', 'utf8'));
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} whole-card frame hover paints preview glow and locked-design warning`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-flow-avatar');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    // Keep the physical pointer over the card while advancing the externally clocked viewer.
    const advance = async (n: 1 | 20) => {
      const button = page.getByRole('button', { name: `Viewer advance ${n} frames`, exact: true });
      await button.focus();
      await button.press('Enter');
    };
    await advance(20);
    const viewer = page.locator('.tank-viewer'),
      cards = page.locator('.viewer-card');
    await expect(cards).toHaveCount(4);
    const hoverHeader = async (index: number) => {
      const box = (await viewer.boundingBox())!,
        root = layout.root.find((p: { name: string }) => p.name === `TankLoad${index + 1}_mc`);
      await page.mouse.move(
        box.x + ((root.matrix.tx / 20 + layout.mask.x + 20) * box.width) / 550,
        box.y + ((root.matrix.ty / 20 + layout.mask.y + 10) * box.height) / 450,
      );
    };
    const canvas = cards.first().locator('canvas');
    const inkBounds = () =>
      canvas.evaluate((node) => {
        const c = node as HTMLCanvasElement,
          data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let left = c.width,
          right = 0,
          top = c.height,
          bottom = 0;
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++)
            if (data[(y * c.width + x) * 4 + 3]) {
              left = Math.min(left, x);
              right = Math.max(right, x);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
        return { left, right, top, bottom };
      });
    await expect(canvas).toHaveAttribute('data-viewer-glow', 'false');
    const before = await inkBounds();
    await hoverHeader(0); // Outside the central Load button, inside the full source card.
    await expect(cards.first().locator('[data-viewer-lines]')).toHaveAttribute(
      'data-viewer-lines',
      'false',
    );
    await advance(1);
    await expect(cards.first().locator('[data-viewer-lines]')).toHaveAttribute(
      'data-viewer-lines',
      'true',
    );
    await expect(canvas).toHaveAttribute('data-viewer-glow', 'true');
    const after = await inkBounds();
    expect(after.left).toBeLessThan(before.left);
    expect(after.right).toBeGreaterThan(before.right);
    await expect(cards.first().locator('[data-caution-alpha]')).toHaveAttribute(
      'data-caution-alpha',
      '0',
    );
    await hoverHeader(1);
    await advance(1);
    const warning = cards.nth(1).locator('[data-caution-alpha]');
    await expect(warning).toHaveAttribute('data-caution-alpha', '0.05');
    await expect(cards.first().locator('[data-viewer-lines]')).toHaveAttribute(
      'data-viewer-lines',
      'false',
    );
    await advance(20);
    expect(Number(await warning.getAttribute('data-caution-alpha'))).toBeCloseTo(0.9, 10);
    if (!native) await expect(warning.locator('path[fill-rule="evenodd"]')).toHaveCount(1);
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-highlights.png`,
    });
    await page.mouse.move(0, 0);
    await advance(1);
    expect(Number(await warning.getAttribute('data-caution-alpha'))).toBeCloseTo(0.8, 10);
    await expect(cards.nth(1).locator('canvas')).toHaveAttribute('data-viewer-glow', 'false');
    await advance(20);
    expect(Number(await warning.getAttribute('data-caution-alpha'))).toBeLessThanOrEqual(0);
    // Keyboard selection still clears preview glow before opening confirmation.
    await cards.first().getByRole('button', { name: 'Load Basic Tank', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Load Basic Tank?', exact: true })).toBeVisible();
    await advance(1);
    await expect(canvas).toHaveAttribute('data-viewer-glow', 'false');
    expect(errors).toEqual([]);
  });
