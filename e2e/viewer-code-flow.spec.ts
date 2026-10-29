import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const enemies = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8')).enemy_tanks;
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer code entry disposes previews, fades separate controls and returns to page one`, async ({
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
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(page.locator('.tank-viewer')).toContainText('Page: 2 out of:');
    const old = await page
      .locator('.viewer-card')
      .first()
      .locator('canvas')
      .getAttribute('data-viewer-instance');
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    const code = page.getByRole('dialog', { name: 'Enter tank code' }),
      toolbar = page.locator('[data-viewer-pane="toolbar:btnNext_mc"]');
    await expect(page.locator('.viewer-card')).toHaveCount(4);
    await advance(1);
    await expect(code).toHaveAttribute('data-viewer-alpha', '0.2');
    await expect(toolbar).toHaveAttribute('data-viewer-alpha', '0.8');
    await expect(page.locator('[data-viewer-pane="card:0"]')).toHaveAttribute(
      'data-viewer-alpha',
      '0.8',
    );
    await advance(20);
    await expect(page.locator('.viewer-card')).toHaveCount(0);
    await expect(page.locator('.viewer-tank-art')).toHaveCount(0);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-viewer-code-entry.png` });
    const field = code.getByRole('textbox', { name: 'Tank code' });
    await expect(field).toHaveAttribute('placeholder', 'Enter Code Here');
    await field.focus();
    await expect(field).toHaveAttribute('placeholder', '');
    await field.fill('retained input');
    await code.focus();
    await field.focus();
    await expect(field).toHaveValue('retained input');
    await code.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('.tank-viewer')).toContainText('Page: 1 out of:');
    await expect(page.locator('.viewer-card')).toHaveCount(4);
    expect(
      await page
        .locator('.viewer-card')
        .first()
        .locator('canvas')
        .getAttribute('data-viewer-instance'),
    ).not.toBe(old);
    await expect(page.locator('.viewer-card').first()).toContainText(enemies[0].name);
    await advance(1);
    await expect(toolbar).toHaveAttribute('data-viewer-alpha', '0.2');
    await expect(page.locator('[data-viewer-pane="card:0"]')).toHaveAttribute(
      'data-viewer-alpha',
      '0.2',
    );
    await advance(20);
    expect(
      await page
        .locator('.viewer-sort')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    ).toBeCloseTo(616.55, 2);
    await page.getByRole('button', { name: 'View local tanks', exact: true }).click();
    expect(
      await page
        .locator('.viewer-sort')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
    ).toBeCloseTo(501.6, 2);
    await page
      .locator('.viewer-card')
      .first()
      .getByRole('button', { name: /^Details for/ })
      .click();
    await advance(20);
    const detail = page.locator('.viewer-detail'),
      detailId = await detail.locator('canvas').getAttribute('data-viewer-instance');
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    await expect(detail.locator('canvas')).toHaveAttribute('data-viewer-instance', detailId!);
    await advance(1);
    await expect(page.locator('[data-viewer-pane="detail"]')).toHaveAttribute(
      'data-viewer-alpha',
      '0.8',
    );
    await advance(20);
    await expect(detail).toHaveCount(0);
    await code.getByRole('button', { name: 'Back', exact: true }).click();
    await advance(20);
    await expect(page.locator('.tank-viewer')).toContainText('Page: 1 out of:');
    await expect(page.locator('.viewer-card')).toHaveCount(4);
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    await advance(20);
    await field.fill('invalid');
    await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    const message = page.getByRole('dialog', { name: 'Tank viewer message' });
    await expect(message).toBeVisible();
    await advance(20);
    await expect(page.locator('.viewer-card')).toHaveCount(0);
    await expect(page.locator('.tank-viewer')).toContainText('Page: 1 out of: 0');
    await message.focus();
    await page.keyboard.press('Escape');
    await advance(20);
    await page.getByRole('button', { name: 'View local tanks', exact: true }).click();
    await expect(page.locator('.viewer-card')).toHaveCount(4);
    expect(errors).toEqual([]);
  });
