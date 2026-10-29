import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { dropPreview } from './helpers/creator';
import type { TankDesign } from '../src/game/core/types';
const data = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'));
const enemy: TankDesign =
  data.enemy_tanks.find(
    (t: TankDesign) => t.classId === 1 && t.parts.some((p) => p.type === 1002),
  ) ?? data.enemy_tanks[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function snapshot(page: Page): Promise<TankDesign> {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'));
}
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator load uses original local viewer, animated cards, code view and fresh editor routing`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local SWF.');
    const errors: string[] = [],
      outbound: string[] = [];
    const custom = { ...enemy, id: 'L10000099', name: 'AAA Local Tank' };
    await page.addInitScript(
      (tank) =>
        localStorage.setItem(
          'open-bubble-tank.profile.v1',
          JSON.stringify({
            version: 1,
            tankViewerHelpSeen: true,
            tanks: [tank],
            achievements: [],
            progression: [],
            nextTankId: 10000100,
            settings: {},
          }),
        ),
      custom,
    );
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (!/^(http:\/\/(localhost|127\.0\.0\.1):|data:|blob:)/.test(r.url()))
        outbound.push(r.url());
    });
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await dropPreview(page, 40, 0);
    expect((await snapshot(page)).parts.length).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    const viewer = page.locator('.tank-viewer');
    await expect(viewer).toHaveAttribute('data-viewer-ready', 'true');
    await expect(page.locator('.creator')).toHaveCount(0);
    await expect(viewer.locator('.viewer-select-tank')).toHaveCount(4);
    await expect(viewer).toContainText(
      `Page: 1 out of: ${Math.ceil((data.enemy_tanks.length + 1) / 4)}`,
    );
    await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await expect(viewer).toContainText('Page: 2 out of:');
    await page.getByRole('button', { name: 'First page', exact: true }).click();
    await expect(viewer.locator('.viewer-sort-motion')).toHaveAttribute('data-icon-frame', '5');
    await page.getByRole('button', { name: 'Sort tanks', exact: true }).click();
    await page.getByRole('button', { name: 'Sort by name', exact: true }).click();
    expect(
      await page
        .locator('.stage-frame,.stage-space,.tank-viewer')
        .evaluateAll((nodes) => nodes.map((n) => ({ x: n.scrollLeft, y: n.scrollTop }))),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(
      await viewer
        .locator('.viewer-card')
        .first()
        .evaluate((node) => {
          const r = node.getBoundingClientRect(),
            stage = document.querySelector('.tank-viewer')!.getBoundingClientRect();
          return (r.x - stage.x) / (stage.width / 550);
        }),
    ).toBeCloseTo(114.75, 1);
    const expected = [...data.enemy_tanks, custom]
      .sort((a, b) =>
        a.name.toLowerCase() < b.name.toLowerCase()
          ? -1
          : a.name.toLowerCase() > b.name.toLowerCase()
            ? 1
            : 0,
      )
      .slice(0, 4);
    expect(
      await viewer
        .locator('.viewer-select-tank')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
    ).toEqual(expected.map((t) => `Load ${t.name}`));
    await viewer.screenshot({ path: `test-results/${native ? 'native' : 'mock'}-tank-viewer.png` });
    await page.getByRole('button', { name: 'Delete AAA Local Tank', exact: true }).click();
    const remove = page.getByRole('dialog', { name: 'Delete AAA Local Tank?', exact: true });
    await remove.getByRole('button', { name: 'No', exact: true }).click();
    await page.getByRole('button', { name: 'Delete AAA Local Tank', exact: true }).click();
    await remove.getByRole('button', { name: 'Yes', exact: true }).click();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).tanks,
      ),
    ).toHaveLength(0);
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    const code = page.getByRole('dialog', { name: 'Enter tank code', exact: true });
    await code.getByRole('textbox', { name: 'Tank code', exact: true }).fill(enemy.sourceCode!);
    // Browser crypto is asynchronous; a dismissed read must keep the preceding queue.
    await page.evaluate(() => {
      const state = window as unknown as {
        releaseTankCodeRead?: () => void;
        tankCodeReadFinished?: boolean;
      };
      const decrypt = crypto.subtle.decrypt.bind(crypto.subtle);
      let first = true;
      crypto.subtle.decrypt = async (...args: Parameters<SubtleCrypto['decrypt']>) => {
        if (first) {
          first = false;
          await new Promise<void>((resolve) => {
            state.releaseTankCodeRead = () => {
              crypto.subtle.decrypt = decrypt;
              resolve();
            };
          });
          try {
            return await decrypt(...args);
          } finally {
            state.tankCodeReadFinished = true;
          }
        }
        return decrypt(...args);
      };
    });
    await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    await expect(
      code.getByRole('button', { name: 'Submit tank code', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(code).toHaveCount(0);
    await page.waitForFunction(
      () => !!(window as unknown as { releaseTankCodeRead?: () => void }).releaseTankCodeRead,
    );
    await page.evaluate(() =>
      (window as unknown as { releaseTankCodeRead: () => void }).releaseTankCodeRead(),
    );
    await page.waitForFunction(
      () => (window as unknown as { tankCodeReadFinished?: boolean }).tankCodeReadFinished,
    );
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(viewer.locator('.viewer-select-tank')).toHaveCount(4);
    await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
    await code.getByRole('textbox', { name: 'Tank code', exact: true }).fill(enemy.sourceCode!);
    await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    await expect(viewer.locator('.viewer-select-tank')).toHaveCount(1);
    await expect(viewer).toContainText('Page: 1 out of: 1');
    await page.getByRole('button', { name: `Details for ${enemy.name}`, exact: true }).click();
    await expect(viewer).toContainText(`Health: ${enemy.life}`);
    await expect(
      page.getByRole('button', { name: 'Tank equipment details', exact: true }),
    ).toBeVisible();
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-tank-viewer-detail.png`,
    });
    const statistics = viewer.locator('.viewer-statistics-window');
    await expect(statistics).toHaveAttribute('data-statistics-frame', '0');
    const closedHeight = (await statistics.boundingBox())!.height;
    await page.getByRole('button', { name: 'Tank equipment details', exact: true }).hover();
    await expect(statistics).toHaveAttribute('data-statistics-frame', '10');
    // DOM layout quantizes fractional sizes before the source matrix is applied.
    expect(
      Math.abs((await statistics.boundingBox())!.height - closedHeight * (149.4 / 14.65)),
    ).toBeLessThan(0.5);
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-tank-viewer-statistics.png`,
    });
    const box = (await viewer.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + 10);
    await expect(statistics).toHaveAttribute('data-statistics-frame', '0');
    await page.getByRole('button', { name: 'Return to small view', exact: true }).click();
    const canvas = viewer.locator('.viewer-tank-art').first();
    await expect
      .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().length))
      .toBeGreaterThan(1000);
    const first = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await expect
      .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
      .not.toBe(first);
    await page.getByRole('button', { name: `Load ${enemy.name}`, exact: true }).click();
    const confirm = page.getByRole('dialog', { name: `Load ${enemy.name}?`, exact: true });
    await expect(confirm).toBeVisible();
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-tank-viewer-confirm.png`,
    });
    await confirm.getByRole('button', { name: 'No', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await page.getByRole('button', { name: `Load ${enemy.name}`, exact: true }).click();
    await confirm.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(viewer).toHaveCount(0);
    expect((await snapshot(page)).parts).toEqual(enemy.parts);
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    await expect(viewer).toHaveAttribute('data-viewer-ready', 'true');
    await page.getByRole('button', { name: 'Search for tanks online', exact: true }).click();
    const message = page.getByRole('dialog', { name: 'Tank viewer message', exact: true });
    await expect(message).toContainText('Community tank search is not connected.');
    await message.getByRole('button', { name: 'Dismiss message', exact: true }).click();
    await page.getByRole('button', { name: 'Return to Tank Creator', exact: true }).click();
    expect((await snapshot(page)).parts).toHaveLength(0);
    expect(errors).toEqual([]);
    expect(outbound).toEqual([]);
  });
