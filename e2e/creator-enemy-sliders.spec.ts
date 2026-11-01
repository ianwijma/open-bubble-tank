import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} mapped enemy sliders retain source scaling, cursor position and cancellation`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-controls');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const values = async () =>
      JSON.parse((await page.locator('[data-control-values]').textContent())!);
    await expect(page.locator('[data-control-values]')).toContainText('"life":20', {
      timeout: 60000,
    });
    const slider = page.getByRole('slider', { name: 'Fixture enemy life', exact: true }),
      group = page.locator('[data-creator-slider="LifeSlider_mc"]'),
      handle = native ? group.locator('img').last() : group.locator('.creator-mock-handle'),
      stage = page.locator('#stage');
    const registration = () =>
      handle.evaluate((node, native) => {
        const style = (node as HTMLElement).style;
        return parseFloat(style.left) + (native ? parseFloat(style.width) / 2 : 5);
      }, native);
    const originalX = await registration();
    const box = (await slider.boundingBox())!;
    expect(box.width / 138).toBeCloseTo(33777 / 65536, 3);
    const point = (x: number) => ({
      x: box.x + ((x + 69) / 138) * box.width,
      y: box.y + ((2.25 + 12) / 28) * box.height,
    });
    let p = point(40);
    await page.mouse.click(p.x, p.y);
    expect((await values()).enemy.life).toBe(20);
    p = point(-39.8);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await slider.dispatchEvent('pointerup', { button: 2, pointerType: 'mouse', buttons: 1 });
    p = point(12.37);
    await page.mouse.move(p.x, p.y);
    await page.mouse.up();
    expect((await values()).enemy.life).toBe(375);
    // The dragged cursor stays at12.35twip-quantized pixels, rather than inverse-mapping375.
    expect(await registration()).toBeCloseTo(12.35, 3);
    await expect(stage).toHaveAttribute('data-enemy-begins', '1');
    await expect(stage).toHaveAttribute('data-enemy-ends', '1');
    await page.getByRole('button', { name: 'Reset fixture enemy', exact: true }).click();
    expect(await registration()).toBeCloseTo(originalX, 3);
    p = point(-39.8);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    p = point(90);
    await page.mouse.move(p.x, p.y);
    expect((await values()).enemy.life).toBe(1000);
    await slider.dispatchEvent('pointercancel', { pointerType: 'mouse' });
    await page.mouse.up();
    expect((await values()).enemy.life).toBe(20);
    expect(await registration()).toBeCloseTo(originalX, 3);
    await expect(stage).toHaveAttribute('data-enemy-cancel', 'true');
    await expect(stage).toHaveAttribute('data-enemy-ends', '2');
    await page.getByRole('button', { name: 'Toggle fixture enemy disabled', exact: true }).click();
    for (const key of ['life', 'reward', 'speed'])
      await expect(
        page.getByRole('slider', { name: `Fixture enemy ${key}`, exact: true }),
      ).toBeDisabled();
    p = point(-39.8);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    p = point(55);
    await page.mouse.move(p.x, p.y);
    await page.mouse.up();
    expect((await values()).enemy.life).toBe(20);
    await expect(stage).toHaveAttribute('data-enemy-begins', '2');
    await page.getByRole('button', { name: 'Toggle fixture enemy disabled', exact: true }).click();
    await slider.press('End');
    expect((await values()).enemy.life).toBe(1000);
    await slider.press('Home');
    expect((await values()).enemy.life).toBe(1);
    await stage.screenshot({
      path: testInfo.outputPath(`${native ? 'native' : 'mock'}-mapped-sliders.png`),
    });
    expect(errors).toEqual([]);
  });
}
