import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} pause and Info retain one layer and share source transition frames`, async ({
    page,
  }) => {
    // Software-rendered CI recorded 16s presentation/action waits per visit.
    // Keep the complete two-visit pointer/focus proof within one test budget.
    test.setTimeout(120000);
    const errors: string[] = [];
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('pause-flow');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const advance = async (count: number) =>
      page
        .getByRole('button', { name: `Advance${count} frames`, exact: true })
        .dispatchEvent('click');
    const stage = page.locator('#stage'),
      layer = page.locator('.pause-button-layer');
    await advance(100);
    await layer.evaluate((node) => node.setAttribute('data-retained-proof', 'original'));
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pause-settled.png` });
    const play = page.locator('[data-pause-piece="btnPlay_mc"]');
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    const info = page.getByRole('dialog', { name: 'Tank information', exact: true });
    await expect(info).toBeVisible();
    const title = page.locator('[data-info-piece="Title_mc"]');
    expect(await title.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).f)).toBe(
      -119.95,
    );
    await title.evaluate((node) => node.setAttribute('data-retained-info', 'original'));
    const portrait = page.locator('.tank-portrait canvas');
    await expect(portrait).toBeVisible();
    const before = await portrait.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
    await advance(5);
    expect(await portrait.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).not.toBe(
      before,
    );
    expect(Number(await play.evaluate((node) => getComputedStyle(node).opacity))).toBeCloseTo(
      0.4921875,
      5,
    );
    await expect(layer).toHaveAttribute('data-retained-proof', 'original');
    await expect(stage).toHaveAttribute('data-world-mode', 'paused');
    await expect(stage).toHaveAttribute('data-player-age', '0');
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pause-info-overlap.png` });
    await advance(5);
    await advance(1);
    expect(Number(await play.evaluate((node) => getComputedStyle(node).opacity))).toBe(0);
    await advance(100);
    await info.focus();
    await page.keyboard.press('Tab');
    await expect(info.getByRole('button', { name: 'BACK', exact: true })).toBeFocused();
    await info.getByRole('button', { name: 'BACK', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
    await advance(5);
    expect(Number(await play.evaluate((node) => getComputedStyle(node).opacity))).toBeCloseTo(
      0.4765625,
      5,
    );
    await expect(page.locator('.tank-info-back')).toBeDisabled();
    await expect(layer).toHaveAttribute('data-retained-proof', 'original');
    await page.getByRole('dialog', { name: 'Paused', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeFocused();
    await advance(100);
    await expect(page.locator('.tank-info-screen')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: 'PLAY', exact: true })).toBeFocused();
    await expect(title).toHaveAttribute('data-retained-info', 'original');
    await page.getByRole('button', { name: 'PLAY', exact: true }).click();
    await advance(20);
    await expect(stage).toHaveAttribute('data-world-mode', 'paused');
    await advance(20);
    await expect(stage).toHaveAttribute('data-world-mode', 'paused');
    await advance(1);
    await expect(stage).toHaveAttribute('data-world-mode', 'playing');
    await expect(stage).toHaveAttribute('data-player-age', '0');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await advance(1);
    await expect(stage).toHaveAttribute('data-player-age', '1');
    await page.getByRole('button', { name: 'Pause again', exact: true }).click();
    await advance(100);
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    await advance(20);
    const pose = await title.getAttribute('style');
    await page.getByRole('dialog', { name: 'Tank information', exact: true }).focus();
    await page.keyboard.press('KeyP');
    await advance(5);
    await expect(title).toHaveAttribute('style', pose!);
    await advance(100);
    await expect(stage).toHaveAttribute('data-world-mode', 'playing');
    expect(errors).toEqual([]);
  });
