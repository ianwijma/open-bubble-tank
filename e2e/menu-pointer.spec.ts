import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const geometry: typeof import('../src/game/data/main-menu-geometry.json') = JSON.parse(
  readFileSync(new URL('../src/game/data/main-menu-geometry.json', import.meta.url), 'utf8'),
);

test(`mock menu picks shape contours, dispatches release actions once and retains keyboard access`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('main-menu');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
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
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  // Keyboard focus yields to real pointer motion; the old button's blur keeps that hover.
  await settings.press('Tab');
  await move(345.8, 299.4);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await move(203.9, 299.4);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  await expect(stage).toHaveAttribute('data-menu-action-count', '0');
  await expect(settings).toHaveAttribute('data-menu-hovered', 'true');
  await expect(page.locator('.menu-rollover-caption')).toContainText('Settings');
  await advance(5);
  await stage.screenshot({
    path: `test-results/mock-menu-pointer-hover.png`,
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
  // Releasing completes the click even when the press began outside the control; scale the stage too.
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
