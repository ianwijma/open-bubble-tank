import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} creator detail thumbnails shrink once and retain independent preview and clip lifetimes`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-details-art');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage');
    const proof = JSON.parse((await stage.getAttribute('data-creator-details-art'))!);
    writeFileSync(testInfo.outputPath('details-art.json'), JSON.stringify(proof, null, 2));
    const [small, large, animated] = proof.thumbnails;
    for (const row of proof.thumbnails) {
      expect(row.first.ink).toBeGreaterThan(0);
      expect(row.held).toEqual(row.first);
      expect(row.removed.ink).toBe(0);
      expect(row.reset).toEqual(row.first);
    }
    // The source never enlarges small clips; a palette preview retains full size.
    expect(small.first).toEqual(small.preview);
    expect(Math.max(large.preview.width, large.preview.height)).toBeGreaterThan(48);
    expect(Math.max(large.first.width, large.first.height)).toBeLessThanOrEqual(50);
    expect(large.first.width).toBeLessThan(large.preview.width);
    expect(animated.animated.hash).not.toBe(animated.first.hash);
    const initialRatio = animated.first.width / animated.preview.width;
    expect(
      Math.abs(animated.animated.width - animated.previewAnimated.width * initialRatio),
    ).toBeLessThan(3);
    if (native) {
      expect(proof.rows.map((row: { key: string }) => row.key)).toEqual([
        'details:static',
        'details:arrow:1',
        'details:arrow:2',
        'selection-info:icon',
        'selection-info:popup',
      ]);
      for (const row of proof.rows) expect(row.ink).toBeGreaterThan(0);
      const [panel, arrow1, arrow2, icon, popup] = proof.rows;
      // Independently recovered authored bounds plus2px raster padding per edge.
      expect(panel).toMatchObject({ x: -2.5, y: -2.5, logicalWidth: 209, logicalHeight: 190 });
      expect(icon).toMatchObject({ x: -2, y: -2, logicalWidth: 18.05, logicalHeight: 19 });
      expect(popup.logicalWidth).toBeCloseTo(149.00274658203125);
      expect(popup.logicalHeight).toBeCloseTo(65.99722290039062);
      expect(arrow1.hash).not.toBe(arrow2.hash);
      expect(arrow1.center).toEqual([51, 153, 204, 255]);
      expect(arrow2.center).toEqual([199, 102, 5, 255]);
      // The dynamic thumbnail and its mask must not be baked into static paint.
      expect(panel.thumbnail).toEqual([0, 0, 0, 191]);
    } else expect(proof.rows).toEqual([]);
    const data = await stage
      .locator('canvas')
      .evaluate((node) => (node as HTMLCanvasElement).toDataURL());
    writeFileSync(
      testInfo.outputPath(`${native ? 'native' : 'mock'}-details-art.png`),
      Buffer.from(data.split(',')[1], 'base64'),
    );
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    await expect(stage).not.toHaveAttribute('data-creator-details-art');
    expect(errors).toEqual([]);
  });
}
