import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} viewer tank layers keep independent poses, scale and clean up`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-tank-artwork');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const stage = page.locator('#stage');
    const proof = JSON.parse((await stage.getAttribute('data-viewer-tank-artwork'))!);
    writeFileSync(testInfo.outputPath('artwork.json'), JSON.stringify(proof, null, 2));
    await stage.screenshot({ path: testInfo.outputPath('artwork.png') });
    expect(proof.first.ink).toBeGreaterThan(0);
    expect(proof.animated.hash).not.toBe(proof.first.hash);
    expect(proof.second).toEqual(proof.first);
    expect(proof.held).toEqual(proof.animated);
    expect(proof.otherHeld).toEqual(proof.second);
    expect(proof.removed).toBe(true);
    expect(proof.reset).toEqual(proof.first);
    expect(proof.fullAgain).toEqual(proof.full);
    expect(proof.half.ink).toBeGreaterThan(0);
    expect(Math.abs(proof.half.width * 2 - proof.full.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(proof.half.height * 2 - proof.full.height)).toBeLessThanOrEqual(2);
    expect(proof.halfBounds).toEqual(proof.firstBounds);
    expect(proof.firstBounds).not.toEqual(proof.designBounds);
    expect(proof.edge.ink).toBeGreaterThan(0);
    expect(proof.edge.left).toBeGreaterThan(500);
    expect(proof.empty.ink).toBe(0);
    expect(proof.cleared).toBe(true);
    await page.getByLabel('Fixture').selectOption('hotkey-input');
    await expect(stage).not.toHaveAttribute('data-viewer-tank-artwork');
    expect(errors).toEqual([]);
  });
}
