import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { exitCreator } from './helpers/creator';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} creator part details retain authored text, masked thumbnail and source hover lifecycle`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    const creator = page.locator('.creator'),
      canvas = page.locator('.creator-workspace canvas');
    await expect.poll(async () => (await creator.boundingBox())?.width).toBe(550);
    const row = (name: string) => page.getByRole('button', { name: `Place ${name}`, exact: true });
    const tooltip = page.getByRole('tooltip');
    await canvas.hover();
    await expect(tooltip).toHaveCount(0);
    await row('Huge Base Bubble').hover();
    await expect(tooltip).toHaveAttribute('aria-label', 'Huge Base Bubble details');
    await expect(tooltip.locator('[data-details-arrow]')).toHaveAttribute(
      'data-details-arrow',
      '1',
    );
    const stage = (await creator.boundingBox())!,
      panel = (await tooltip.boundingBox())!;
    expect(panel.x - stage.x).toBeCloseTo(189, 1);
    expect(panel.y - stage.y).toBeCloseTo(253, 1);
    expect(panel.width).toBe(222);
    expect(panel.height).toBe(186);
    const thumb = tooltip.locator('canvas');
    await expect(thumb).toHaveCSS('width', '49px');
    await expect(thumb).toHaveCSS('height', '49px');
    await expect(tooltip.locator('.creator-details-arrow-mask')).toHaveCSS('overflow', 'hidden');
    const ink = () =>
      thumb.evaluate((node) => {
        const c = node as HTMLCanvasElement,
          data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        return data.filter((v, i) => i % 4 === 3 && v > 8).length;
      });
    await expect.poll(ink).toBeGreaterThan(100);
    const firstInstance = await tooltip.getAttribute('data-instance');
    await row('Huge Base Bubble').click();
    await expect(tooltip.locator('[data-details-arrow]')).toHaveAttribute(
      'data-details-arrow',
      '2',
    );
    await expect(tooltip).not.toHaveAttribute('data-instance', firstInstance!);
    const selectedInstance = await tooltip.getAttribute('data-instance');
    await canvas.hover();
    await expect(tooltip).toHaveCount(0);
    await canvas.focus();
    await row('Huge Base Bubble').focus();
    await expect(tooltip).toHaveAttribute('aria-label', 'Huge Base Bubble details');
    await expect(tooltip).not.toHaveAttribute('data-instance', selectedInstance!);
    await expect(row('Huge Base Bubble')).toHaveAttribute(
      'aria-describedby',
      (await tooltip.getAttribute('id'))!,
    );
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await expect(tooltip).toHaveCount(0);
    await row('Basic Cannon').hover();
    const field = (name: string) => tooltip.locator(`[data-creator-field="${name}"] > .sr-only`);
    await expect(field('name_txt')).toHaveText('Basic Cannon');
    await expect(field('gunPoints_txt')).toHaveText('1');
    await expect(field('bubblePoints_txt')).toHaveText('Low');
    await expect(field('damage_txt')).toHaveText('Damage: 1');
    await row('Seekers').hover();
    await expect(field('special_txt')).toHaveText('Must be class 2 or higher.');
    await expect(field('bubblePoints_txt')).toHaveText('Medium');
    await expect(tooltip.locator('[data-details-arrow]')).toHaveCSS('opacity', '0.4');
    const arrow = (await tooltip.locator('[data-details-arrow]').boundingBox())!;
    expect(arrow.y - (await row('Seekers').boundingBox())!.y).toBeCloseTo(0, 1);
    await creator.screenshot({
      path: testInfo.outputPath(`${native ? 'native' : 'mock'}-part-details.png`),
    });
    const port = page.getByRole('group', { name: 'Parts palette' });
    await port.hover();
    await page.mouse.wheel(0, 100);
    await expect
      .poll(async () =>
        Number(
          await page.getByRole('scrollbar', { name: 'Scroll parts' }).getAttribute('aria-valuenow'),
        ),
      )
      .toBeGreaterThan(0);
    // Scrolling moves another row under the pointer, causing a fresh rollover.
    const hovered = port.locator('button:hover');
    const hoveredName = (await hovered.getAttribute('aria-label'))!.replace(/^Place /, '');
    await expect(field('name_txt')).toHaveText(hoveredName);
    await canvas.hover();
    await expect(tooltip).toHaveCount(0);
    await page.getByRole('button', { name: 'Body', exact: true }).click();
    await row('Small Bubble').focus();
    await expect(tooltip).toHaveCount(1);
    await page
      .getByRole('button', { name: 'Drag Small Bubble into design', exact: true })
      .press('Enter');
    await expect(tooltip).toHaveCount(0);
    await canvas.press('Escape');
    await exitCreator(page);
    await expect(tooltip).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${native ? 'SWF' : 'mock'} locked palette parts reveal no details and clean up keyboard descriptions`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-palette-rows');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const basic = page.getByRole('button', { name: 'Place Basic Cannon', exact: true });
    await basic.focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toHaveAttribute('aria-label', 'Basic Cannon details');
    await expect(basic).toHaveAttribute('aria-describedby', (await tooltip.getAttribute('id'))!);
    await page
      .getByRole('button', { name: 'Exploding Pierce Cannon, unlocks at level 6', exact: true })
      .hover();
    // Remove independent keyboard focus before checking pointer-only disabled-row behavior.
    await basic.blur();
    await expect(tooltip).toHaveCount(0);
    await expect(basic).not.toHaveAttribute('aria-describedby');
    await page.getByLabel('Fixture').selectOption('creator-buttons');
    await expect(tooltip).toHaveCount(0);
  });
}
