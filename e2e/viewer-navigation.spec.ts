import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const enemies = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8')).enemy_tanks;
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer navigation retains route-specific button state and same-tank refreshes`, async ({
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
    const advance = () =>
        page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click(),
      first = page.getByRole('button', { name: 'First page', exact: true }),
      previous = page.getByRole('button', { name: 'Previous page', exact: true }),
      next = page.getByRole('button', { name: 'Next page', exact: true }),
      viewer = page.locator('.tank-viewer'),
      cards = page.locator('.viewer-card'),
      detail = page.locator('.viewer-detail');
    await advance();
    await expect(first).toBeDisabled();
    await expect(previous).toBeDisabled();
    await next.click();
    await previous.click();
    await expect(viewer).toContainText('Page: 1 out of:');
    await expect(first).toBeEnabled();
    await expect(previous).toBeDisabled();
    const oldFirst = await cards.first().locator('canvas').getAttribute('data-viewer-instance');
    await first.click();
    expect(await cards.first().locator('canvas').getAttribute('data-viewer-instance')).not.toBe(
      oldFirst,
    );
    await page.getByRole('button', { name: 'Sort tanks', exact: true }).click();
    // The external frame button closes this rollover menu. Select through its keyboard path.
    const sortByName = page.getByRole('button', { name: 'Sort by name', exact: true });
    await sortByName.focus();
    await sortByName.press('Enter');
    await expect(first).toBeEnabled();
    await expect(previous).toBeEnabled();
    await previous.click();
    await expect(previous).toBeDisabled();
    const pages = Math.ceil(enemies.length / 4);
    for (let i = 1; i < pages; i++) await next.click();
    await expect(viewer).toContainText(`Page: ${pages} out of: ${pages}`);
    await expect(next).toBeDisabled();
    await cards
      .last()
      .getByRole('button', { name: /^Details for/ })
      .click();
    await advance();
    await expect(viewer).toContainText(`Tank: ${enemies.length} out of: ${enemies.length}`);
    await expect(next).toBeEnabled();
    const lastInstance = await detail.locator('canvas').getAttribute('data-viewer-instance');
    await next.click();
    expect(await detail.locator('canvas').getAttribute('data-viewer-instance')).not.toBe(
      lastInstance,
    );
    await expect(viewer).toContainText(`Tank: ${enemies.length} out of: ${enemies.length}`);
    await expect(next).toBeDisabled();
    await page.getByRole('button', { name: 'Return to small view', exact: true }).click();
    await advance();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(viewer).toContainText(`Page: ${pages} out of: ${pages}`);
    await expect(next).toBeDisabled();
    await first.click();
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    await advance();
    const code = page.getByRole('dialog', { name: 'Enter tank code' });
    await code.getByRole('button', { name: 'Back', exact: true }).click();
    await advance();
    await expect(first).toBeDisabled();
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    await advance();
    await code.getByRole('textbox', { name: 'Tank code' }).fill(enemies[0].sourceCode);
    await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    await expect(viewer).toContainText('Page: 1 out of: 1');
    await advance();
    await expect(first).toBeDisabled();
    await expect(previous).toBeDisabled();
    await expect(next).toBeDisabled();
    await cards
      .first()
      .getByRole('button', { name: /^Details for/ })
      .click();
    await advance();
    await expect(next).toBeEnabled();
    const singleInstance = await detail.locator('canvas').getAttribute('data-viewer-instance');
    await next.click();
    expect(await detail.locator('canvas').getAttribute('data-viewer-instance')).not.toBe(
      singleInstance,
    );
    await expect(viewer).toContainText('Tank: 1 out of: 1');
    await expect(next).toBeDisabled();
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-navigation.png`,
    });
    await page.getByRole('button', { name: 'Return to small view', exact: true }).click();
    await advance();
    await expect(next).toBeDisabled();
    await page.getByRole('button', { name: 'View local tanks', exact: true }).click();
    await expect(first).toBeDisabled();
    await expect(next).toBeEnabled();
    expect(errors).toEqual([]);
  });
