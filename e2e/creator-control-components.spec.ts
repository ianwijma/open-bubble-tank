import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} creator controls retain button state, hold boundaries and slider handle geometry`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-controls');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const stage = page.locator('#stage');
    const values = async () =>
      JSON.parse((await page.locator('[data-control-values]').textContent())!);
    await expect(page.locator('[data-control-values]')).toContainText('"scale":1', {
      timeout: 60000,
    });
    const undo = page.getByRole('button', { name: 'Undo', exact: true });
    await expect(undo).toBeDisabled();
    const undoBox = (await undo.boundingBox())!,
      rootBox = (await page.locator('.creator').boundingBox())!;
    expect(undoBox.x - rootBox.x).toBeCloseTo(303.5, 1);
    expect(undoBox.y - rootBox.y).toBeCloseTo(418.5, 1);
    expect(undoBox.width).toBeCloseTo(58, 1);
    const symmetry = page.getByRole('checkbox', { name: 'Symmetric Mode', exact: true });
    await expect(symmetry).toBeChecked();
    await symmetry.uncheck();
    await expect(symmetry).not.toBeChecked();
    await page.getByRole('button', { name: 'Toggle fixture undo', exact: true }).click();
    await expect(undo).toBeEnabled();
    const right = page.getByRole('button', { name: 'Nudge right', exact: true });
    await right.hover();
    await page.mouse.down();
    await page
      .getByRole('button', { name: 'Step fixture hold 3 frames', exact: true })
      .evaluate((n) => (n as HTMLButtonElement).click());
    await page.mouse.up();
    expect((await values()).x).toBe(4);
    await expect(stage).toHaveAttribute('data-hold-starts', '1');
    await expect(stage).toHaveAttribute('data-hold-ends', '1');
    await right.press('Enter');
    expect((await values()).x).toBe(5);
    const scale = page.getByRole('slider', { name: 'Part scale', exact: true });
    const group = page.locator('[data-creator-slider="Resize_mc"]');
    const handle = native ? group.locator('img').last() : group.locator('.creator-mock-handle');
    const center = async () => {
      const b = (await handle.boundingBox())!;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const groupBox = await group.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y };
    });
    // Track presses away from the handle do not start a drag or change the scale.
    await page.mouse.click(groupBox.x + 40, groupBox.y + 2.25);
    expect((await values()).scale).toBe(1);
    await expect(stage).toHaveAttribute('data-slider-begins', '0');
    let p = await center();
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(groupBox.x + 90, groupBox.y + 2.25);
    await page.mouse.up();
    expect((await values()).scale).toBe(2);
    await expect(stage).toHaveAttribute('data-slider-begins', '1');
    await expect(stage).toHaveAttribute('data-slider-ends', '1');
    await scale.press('Home');
    expect((await values()).scale).toBe(0.5);
    // A loaded valid scale beyond the slider range keeps its value and clamps only the handle.
    await page.getByRole('button', { name: 'Load fixture scale 3', exact: true }).click();
    expect((await values()).scale).toBe(3);
    p = await center();
    expect(p.x - groupBox.x).toBeCloseTo(57, 1);
    await page.getByRole('button', { name: 'Reset fixture selection', exact: true }).click();
    p = await center();
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    // Exercise the non-primary release guard without opening a browser context menu.
    await scale.dispatchEvent('pointerup', { button: 2, pointerType: 'mouse', buttons: 1 });
    await expect(stage).toHaveAttribute('data-slider-ends', '1');
    await page.mouse.move(groupBox.x - 90, groupBox.y + 2.25);
    await page.mouse.up();
    expect((await values()).scale).toBe(0.5);
    await expect(stage).toHaveAttribute('data-slider-ends', '2');
    await page.getByRole('button', { name: 'Reset fixture selection', exact: true }).click();
    await scale.evaluate((node) =>
      node.addEventListener(
        'pointerdown',
        (event) => {
          (node as HTMLElement).dataset.lastPointer = String((event as PointerEvent).pointerId);
        },
        { once: true },
      ),
    );
    p = await center();
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(groupBox.x, groupBox.y + 2.25);
    await scale.evaluate((node) => node.releasePointerCapture(Number(node.dataset.lastPointer)));
    // Capture loss is delivered at the next pointer event; cancellation restores the start value.
    await page.mouse.move(groupBox.x + 1, groupBox.y + 2.25);
    await expect(stage).toHaveAttribute('data-slider-cancel', 'true');
    expect((await values()).scale).toBe(1);
    await expect(stage).toHaveAttribute('data-slider-ends', '3');
    await page.mouse.up();
    await expect(stage).toHaveAttribute('data-slider-ends', '3');
    await stage.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-creator-control-components.png`,
    });
    expect(errors).toEqual([]);
  });
}
