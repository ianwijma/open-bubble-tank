import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer reparents the selected preview and retains fading card/detail lifetimes`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const advance = async (n: 1 | 5 | 20) =>
      page.getByRole('button', { name: `Viewer advance ${n} frames`, exact: true }).click();
    await advance(20);
    const cards = page.locator('.viewer-card');
    await expect(cards).toHaveCount(4);
    const instance = await cards.nth(1).locator('canvas').getAttribute('data-viewer-instance');
    await cards
      .nth(1)
      .getByRole('button', { name: /^Details for/ })
      .click();
    const detail = page.locator('[data-viewer-pane="detail"]');
    await expect(detail.locator('canvas')).toHaveAttribute('data-viewer-instance', instance!);
    await expect(cards.nth(1).locator('canvas')).toHaveCount(0);
    await expect(page.locator('.viewer-tank-art')).toHaveCount(4);
    await expect(detail).toHaveAttribute('data-viewer-alpha', '0');
    await expect(page.locator('.tank-viewer')).toContainText('Tank: 2 out of:');
    await advance(1);
    await expect(detail).toHaveAttribute('data-viewer-alpha', '0.2');
    await expect(page.locator('[data-viewer-pane="card:0"]')).toHaveAttribute(
      'data-viewer-alpha',
      '0.8',
    );
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-viewer-crossfade.png` });
    await advance(5);
    await expect(cards).toHaveCount(4);
    await advance(1);
    await expect(cards).toHaveCount(2);
    await advance(20);
    await expect(cards).toHaveCount(0);
    await expect(detail.locator('canvas')).toHaveAttribute('data-viewer-instance', instance!);
    await expect(detail).toHaveAttribute('data-viewer-alpha', '1');
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    const next = await detail.locator('canvas').getAttribute('data-viewer-instance');
    expect(next).not.toBe(instance);
    await expect(detail).toHaveAttribute('data-viewer-alpha', '1');
    await expect(page.locator('.tank-viewer')).toContainText('Tank: 3 out of:');
    await advance(20);
    await page.getByRole('button', { name: 'Return to small view', exact: true }).click();
    await expect(cards).toHaveCount(4);
    await expect(detail).toHaveAttribute('inert', '');
    const returned = await cards.nth(2).locator('canvas').getAttribute('data-viewer-instance');
    expect(returned).not.toBe(next);
    await advance(1);
    await expect(detail).toHaveAttribute('data-viewer-alpha', '0.8');
    await expect(page.locator('[data-viewer-pane="card:0"]')).toHaveAttribute(
      'data-viewer-alpha',
      '0.2',
    );
    await advance(20);
    await expect(detail).toHaveCount(0);
    const before = await cards.first().locator('canvas').getAttribute('data-viewer-instance');
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    expect(await cards.first().locator('canvas').getAttribute('data-viewer-instance')).not.toBe(
      before,
    );
    await expect(page.locator('[data-viewer-pane="card:0"]')).toHaveAttribute(
      'data-viewer-alpha',
      '1',
    );
    expect(errors).toEqual([]);
  });
