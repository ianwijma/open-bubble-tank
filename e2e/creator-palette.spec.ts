import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator rows preserve source paint, fractional scrolling and capture cleanup`, async ({
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
    const creator = page.locator('.creator'),
      port = page.getByRole('group', { name: 'Parts palette' }),
      scroll = page.getByRole('scrollbar', { name: 'Scroll parts' }),
      down = page.getByRole('button', { name: 'Scroll parts down', exact: true });
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await expect
      .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())?.width)
      .toBe(350);
    const stage = (await creator.boundingBox())!,
      bounds = (await port.boundingBox())!,
      scale = stage.width / 550;
    expect((bounds.x - stage.x) / scale).toBeCloseTo(398, 1);
    expect((bounds.y - stage.y) / scale).toBeCloseTo(255.1, 1);
    expect(bounds.width / scale).toBeCloseTo(119, 1);
    expect(bounds.height / scale).toBeCloseTo(182, 1);
    await expect(port.locator('[data-creator-field="cost_txt"]')).toHaveCount(0);
    const medium = page.getByRole('button', { name: 'Place Medium Bubble', exact: true });
    await medium.hover();
    await expect(medium).toHaveAttribute('data-row-frame', '2');
    await page.mouse.move(1, 1);
    await expect(medium).toHaveAttribute('data-row-frame', '1');
    // Source selects on release over a row, even when the press began elsewhere.
    await page.mouse.down();
    const row = (await medium.boundingBox())!;
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
    await page.mouse.up();
    // The deliberate outside-origin press can select document text; remove that QA overlay.
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await expect(medium).toHaveAttribute('data-row-frame', '3');
    await expect(
      page.getByRole('button', { name: 'Drag Medium Bubble into design' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    const carrier = page.getByRole('button', { name: 'Place Seeker Carrier', exact: true }),
      first = port.getByRole('button').first(),
      second = port.getByRole('button').nth(1);
    expect(((await second.boundingBox())!.y - (await first.boundingBox())!.y) / scale).toBeCloseTo(
      20,
      1,
    );
    await carrier.click();
    await expect(carrier).toHaveAttribute('data-row-frame', '3');
    await expect(scroll).toHaveAttribute('aria-controls', (await port.getAttribute('id'))!);
    await expect(scroll).toHaveAttribute('aria-valuemax', '341.5'); // 26 rows, source21.5px bounds.
    await down.click();
    const oneStep = 341.5 / 17;
    expect(Number(await scroll.getAttribute('aria-valuenow'))).toBeCloseTo(oneStep, 6);
    const relativeY = ((await first.boundingBox())!.y - (await port.boundingBox())!.y) / scale;
    expect(relativeY).toBeCloseTo(-0.1 - oneStep, 1); // Keep fractions despite integer scrollTop.
    await scroll.press('End');
    expect(Number(await scroll.getAttribute('aria-valuenow'))).toBeCloseTo((341.5 * 120) / 121, 6);
    await expect(
      page.getByRole('button', { name: 'Place Spin-Fire', exact: true }),
    ).toBeInViewport();
    await scroll.press('Home');
    await scroll.press('ArrowDown');
    expect(Number(await scroll.getAttribute('aria-valuenow'))).toBeCloseTo(oneStep, 6);
    await scroll.press('ArrowUp');
    await expect(scroll).toHaveAttribute('aria-valuenow', '0');
    const barArt = scroll.locator(native ? ':scope > img' : ':scope > svg');
    const paint = async () => {
      if (native)
        await expect
          .poll(() => barArt.evaluate((node) => (node as HTMLImageElement).complete))
          .toBe(true);
      return barArt.screenshot();
    };
    await scroll.hover();
    const hoverPaint = await paint();
    await scroll.click();
    expect(await paint()).toEqual(hoverPaint); // Ordinary release retains source hover frame3.
    const bar = (await scroll.boundingBox())!;
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2 + 60 * scale, { steps: 6 });
    expect(Number(await scroll.getAttribute('aria-valuenow'))).toBeGreaterThan(120);
    const stopped = await scroll.getAttribute('aria-valuenow');
    await scroll.evaluate((node) => node.releasePointerCapture(1));
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2 + 100 * scale);
    await page.mouse.up();
    await expect(scroll).toHaveAttribute('aria-valuenow', stopped!);
    await port.hover();
    const beforeWheel = Number(await scroll.getAttribute('aria-valuenow'));
    await page.mouse.wheel(0, -100);
    await expect
      .poll(async () => Number(await scroll.getAttribute('aria-valuenow')))
      .toBeLessThan(beforeWheel);
    await page.getByRole('button', { name: 'Behavior', exact: true }).click();
    await expect(scroll).toHaveAttribute('aria-disabled', 'true');
    await expect(down).toBeDisabled();
    await scroll.press('End'); // Even programmatic focus must not move a disabled handle.
    await expect(scroll).toHaveAttribute('aria-valuenow', '0');
    await expect(scroll).toHaveCSS('top', '18px');
    await creator.screenshot({ path: testInfo.outputPath('disabled-scrollbar.png') });
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await expect(scroll).toHaveAttribute('aria-valuenow', '0');
    await carrier.click();
    if (native) {
      await expect(carrier.locator(':scope > img')).toHaveCount(1);
      await expect(carrier.locator('[data-creator-field="name_txt"] img')).toBeVisible();
    }
    await creator.screenshot({ path: testInfo.outputPath('source-palette-rows.png') });
    expect(errors).toEqual([]);
  });

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} locked creator rows retain both alpha factors and clean up their wheel listener`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-palette-rows');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const port = page.getByRole('group', { name: 'Parts palette' }),
      scroll = page.getByRole('scrollbar', { name: 'Scroll parts' }),
      locked = page.getByRole('button', {
        name: 'Exploding Pierce Cannon, unlocks at level 6',
        exact: true,
      });
    await expect(locked).toBeDisabled();
    await expect(locked).toHaveAttribute('data-row-frame', '4');
    await expect(locked).toHaveCSS('opacity', '0.5');
    const name = locked.locator('[data-creator-field="name_txt"]');
    await expect(name).toHaveCSS('opacity', '0.5');
    await expect(name.locator(':scope > .sr-only')).toHaveText('???');
    await expect(locked.locator('[data-creator-field="cost_txt"] > .sr-only')).toHaveText('?');
    await page.locator('#stage').screenshot({ path: testInfo.outputPath('locked-palette.png') });
    await port.hover();
    await page.mouse.wheel(0, 100);
    // StrictMode setup must still produce exactly one source step for one wheel event.
    await expect
      .poll(async () => Number(await scroll.getAttribute('aria-valuenow')))
      .toBeCloseTo(181.5 / 9, 6);
    await page.getByLabel('Fixture').selectOption('creator-buttons');
    await expect(port).toHaveCount(0);
    await expect(scroll).toHaveCount(0);
    expect(errors).toEqual([]);
  });
