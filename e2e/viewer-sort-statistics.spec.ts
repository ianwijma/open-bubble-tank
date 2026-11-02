import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} viewer sort and statistics widgets retain source timelines and rollover descriptions`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-sort-statistics');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage'),
      description = page.getByLabel('Widget description'),
      sort = page.getByRole('button', { name: 'Sort tanks', exact: true }),
      motion = stage.locator('.viewer-sort-motion'),
      name = page.getByRole('button', { name: 'Sort by name', exact: true }),
      equipment = page.getByRole('button', { name: 'Tank equipment details', exact: true }),
      window = stage.locator('.viewer-statistics-window');
    await expect(stage).toHaveAttribute('data-viewer-widget-subscriptions', '2');
    await page.mouse.move(0, 0);
    await sort.hover({ position: { x: 3, y: 3 } });
    await expect(sort).toHaveAttribute('aria-expanded', 'true');
    await expect(description).toHaveText('Sort your list of tanks by...');
    await expect(motion).toHaveAttribute('data-icon-frame', '1');
    await expect(motion).toHaveAttribute('data-menu-frame', '1');
    const sourceX = [
        562.5500000000001, 542.3000000000001, 524.35, 508.84999999999997, 495.7, 484.95,
        476.59999999999997, 470.6, 467.05, 465.85,
      ],
      positions = [];
    for (let i = 0; i < 10; i++) {
      if (i)
        await page
          .getByRole('button', { name: 'Advance one frame', exact: true })
          .dispatchEvent('click');
      const box = (await name.boundingBox())!,
        base = (await stage.boundingBox())!;
      positions.push(box.x - base.x);
      expect(box.x - base.x).toBeCloseTo(sourceX[i], 1);
      await expect(motion).toHaveAttribute('data-icon-frame', String(Math.min(i + 1, 5)));
      await expect(motion).toHaveAttribute('data-menu-frame', String(i + 1));
    }
    await page
      .getByRole('button', { name: 'Advance twenty frames', exact: true })
      .dispatchEvent('click');
    await expect(motion).toHaveAttribute('data-menu-frame', '10');
    for (const [label, value] of [
      ['name', 'name'],
      ['author', 'author'],
      ['class', 'classId'],
      ['gun points', 'guns'],
      ['bubble points', 'bubbles'],
    ]) {
      await page.mouse.move(0, 0);
      await sort.hover({ position: { x: 3, y: 3 } });
      await page
        .getByRole('button', { name: 'Advance nine frames', exact: true })
        .dispatchEvent('click');
      await page.getByRole('button', { name: `Sort by ${label}`, exact: true }).click();
      await expect(page.getByLabel('Selected sorts')).toContainText(value);
      await expect(sort).toHaveAttribute('aria-expanded', 'false');
    }
    await page.mouse.move(0, 0);
    await expect(description).toHaveText('');
    await page
      .getByRole('button', { name: 'Advance nine frames', exact: true })
      .dispatchEvent('click');
    await expect(motion).toHaveAttribute('data-menu-frame', '10');
    const bubbleBox = (await page
        .getByRole('button', { name: 'Sort by bubble points', exact: true })
        .boundingBox())!,
      stageBox = (await stage.boundingBox())!;
    expect(bubbleBox.y - stageBox.y).toBeCloseTo(366.1, 1);
    await page.getByRole('button', { name: 'Toggle sort enabled', exact: true }).click();
    await expect(sort).toBeDisabled();
    await page.getByRole('button', { name: 'Toggle sort enabled', exact: true }).click();
    await sort.focus();
    await expect(sort).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.move(0, 0);
    await equipment.focus();
    await expect(equipment).toHaveAttribute('aria-expanded', 'true');
    await expect(description).toHaveText('All the detailed information for the tank');
    const heights = [14.65, 42.95, 67.9, 89.5, 107.8, 122.8, 134.45, 142.75, 147.75, 149.4],
      actual = [];
    for (let i = 0; i < 10; i++) {
      if (i)
        await page
          .getByRole('button', { name: 'Advance one frame', exact: true })
          .dispatchEvent('click');
      await expect(window).toHaveAttribute('data-statistics-frame', String(i + 1));
      const height = await window.evaluate((node) =>
        parseFloat((node as HTMLElement).style.height),
      );
      actual.push(height);
      expect(height).toBeCloseTo(heights[i], 2);
    }
    await page
      .getByRole('button', { name: 'Toggle tank type', exact: true })
      .dispatchEvent('click');
    await expect(window).toHaveAttribute('data-statistics-frame', '10');
    await expect(window.locator('[data-creator-field="primary_txt"]')).toContainText(
      '2 Basic Cannons',
    );
    await expect(window.locator('[data-creator-field="secondary_txt"]')).toContainText('Skittish');
    await expect(window.locator('[data-creator-field="PrimarySecondary_txt"]')).toContainText(
      'Enemy Weapons:',
    );
    await stage.screenshot({ path: testInfo.outputPath('viewer-widgets.png') });
    await sort.focus();
    await expect(equipment).toHaveAttribute('aria-expanded', 'false');
    await expect(window).toHaveAttribute('data-statistics-frame', '0');
    expect(
      await window.evaluate((node) => parseFloat((node as HTMLElement).style.height)),
    ).toBeCloseTo(14.65, 2);
    await equipment.hover();
    await expect(equipment).toHaveAttribute('aria-expanded', 'true');
    await page.mouse.move(0, 0);
    await expect(window).toHaveAttribute('data-statistics-frame', '0');
    await expect(description).toHaveText('');
    writeFileSync(
      testInfo.outputPath('poses.json'),
      JSON.stringify({ positions, actual }, null, 2),
    );
    await page.getByRole('button', { name: 'Unmount widgets', exact: true }).click();
    await expect(stage).toHaveAttribute('data-viewer-widget-subscriptions', '0');
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    expect(errors).toEqual([]);
  });
}
