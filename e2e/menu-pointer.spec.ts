import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const geometry: typeof import('../src/game/data/main-menu-geometry.json') = JSON.parse(
  readFileSync(new URL('../src/game/data/main-menu-geometry.json', import.meta.url), 'utf8'),
);
const reference: {
  observations: {
    label: string;
    x: number;
    y: number;
    target?: { name: string; parent: string };
  }[];
} = JSON.parse(
  readFileSync(new URL('../tests/fixtures/menu-pointer-reference.json', import.meta.url), 'utf8'),
);
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} menu picks shape contours, dispatches release actions once and retains keyboard access`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('main-menu');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const menu = page.locator('.main-menu'),
      stage = page.locator('#stage');
    await expect(menu).toHaveAttribute('data-menu-age', '0', { timeout: 60000 });
    const advance = async (count: number) =>
      page
        .getByRole('button', { name: `Menu advance ${count} frames`, exact: true })
        .evaluate((node) => (node as HTMLButtonElement).click());
    const point = async (x: number, y: number) => {
      const r = (await menu.boundingBox())!;
      return { x: r.x + (x * r.width) / 550, y: r.y + (y * r.height) / 450 };
    };
    const move = async (x: number, y: number) => {
      const p = await point(x, y);
      await page.mouse.move(p.x, p.y);
    };
    await advance(95);
    await advance(1);
    await advance(100);
    if (native) {
      for (const sample of reference.observations.filter((s) => s.target)) {
        await test.step(`original target: ${sample.label}`, async () => {
          await move(sample.x, sample.y);
          await advance(20);
          const control = sample.target!.name === 'inner' ? sample.target!.parent : undefined;
          for (const p of geometry.controls)
            await expect(page.locator(`[data-menu-control="${p.name}"]`)).toHaveAttribute(
              'data-menu-hovered',
              String(p.name === control),
            );
          const hand = control || geometry.controls.some((p) => p.name === sample.target!.name);
          await expect(menu).toHaveCSS('cursor', hand ? 'pointer' : 'default');
        });
      }
    }
    for (const p of geometry.controls) {
      await move(400, 410);
      await move(
        p.matrix.tx / 20 + (p.bounds.x + 0.2) * p.matrix.a,
        p.matrix.ty / 20 + (p.bounds.y + 0.2) * p.matrix.d,
      );
      await page.mouse.down();
      await page.mouse.up();
      await expect(stage).toHaveAttribute('data-menu-action-count', '0');
      await expect(page.locator(`[data-menu-control="${p.name}"]`)).toHaveAttribute(
        'data-menu-hovered',
        'false',
      );
    }
    if (native) {
      // Observed original: icon-only geometry targets partsPacks_btn, not inner, and does nothing.
      await move(181, 225);
      await page.mouse.down();
      await page.mouse.up();
      await expect(stage).toHaveAttribute('data-menu-action-count', '0');
      await expect(menu).toHaveCSS('cursor', 'pointer');
      await expect(page.locator('[data-menu-control="partsPacks_btn"]')).toHaveAttribute(
        'data-menu-hovered',
        'false',
      );
    }
    const settings = page.getByRole('button', { name: 'Settings', exact: true });
    // Keyboard focus yields to real pointer motion; the old button's blur keeps that hover.
    await settings.press('Tab');
    await move(345.8, 299.4);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await expect(page.locator('[data-menu-control="credits_btn"]')).toHaveAttribute(
      'data-menu-hovered',
      'true',
    );
    await expect(page.locator('.menu-series-caption')).toContainText('Credits');
    await move(203.9, 299.4);
    await page.mouse.down({ button: 'right' });
    await page.mouse.up({ button: 'right' });
    await expect(stage).toHaveAttribute('data-menu-action-count', '0');
    await expect(settings).toHaveAttribute('data-menu-hovered', 'true');
    await expect(page.locator('.menu-series-caption')).toContainText('Settings');
    await advance(5);
    if (native) {
      // Inside hover-grown inner490, beyond both the idle ellipse and the DOM button rectangle.
      await move(181.9, 299.4);
      await expect(settings).toHaveAttribute('data-menu-hovered', 'true');
    }
    await stage.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-menu-pointer-hover.png`,
    });
    await page.mouse.down();
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-menu-action-count', '1');
    await expect(stage).toHaveAttribute('data-menu-action', 'settings_btn');
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(1);
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await advance(20);
    // Match Flash MOUSE_UP even when the press began outside the control; scale the stage too.
    await stage.evaluate((node) => {
      node.style.transform = 'scale(.75)';
      node.style.transformOrigin = 'top left';
    });
    await move(400, 410);
    await page.mouse.down();
    await move(203.9, 299.4);
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-menu-action-count', '2');
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
    await advance(20);
    await advance(5);
    await advance(5);
    await advance(1);
    await page.getByRole('button', { name: 'DONE', exact: true }).click();
    await advance(20);
    await settings.press('Enter');
    await expect(stage).toHaveAttribute('data-menu-action-count', '3');
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
