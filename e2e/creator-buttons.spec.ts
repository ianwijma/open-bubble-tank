import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'synthetic'} creator button rasters keep states, nested transforms and hit-only geometry separate`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-buttons');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-buttons'))!);
    const evidence = testInfo.outputPath('creator-button-rasters.json');
    writeFileSync(evidence, JSON.stringify(proof, null, 2));
    await testInfo.attach('creator-button-rasters', {
      path: evidence,
      contentType: 'application/json',
    });
    const { states, nested } = proof.primitive;
    expect(states.up).toMatchObject({ x: 8, y: 3, width: 14, height: 14 });
    expect(states.up.pixel.slice(0, 3)).toEqual([255, 0, 0]);
    expect(Math.abs(states.up.pixel[3] - 128)).toBeLessThanOrEqual(1);
    expect(states.over.pixel).toEqual([0, 0, 255, 255]);
    expect(states.down.pixel).toEqual([255, 255, 0, 255]);
    expect(states.hit).toMatchObject({
      x: -2,
      y: -2,
      width: 34,
      height: 34,
      pixel: [0, 255, 0, 255],
    });
    expect(nested).toMatchObject({ x: 20, y: 16, width: 24, height: 34 });
    expect(nested.pixel.slice(0, 3)).toEqual([255, 0, 0]);
    expect(Math.abs(nested.pixel[3] - 128)).toBeLessThanOrEqual(1);
    if (native) {
      expect(proof.rows).toHaveLength(49);
      expect(proof.rows.every((r: { ink: number }) => r.ink > 0)).toBe(true);
      const hash = (key: string) => proof.rows.find((r: { key: string }) => r.key === key)!.hash;
      expect(hash('SymmetricMode_mc:1:up')).not.toBe(hash('SymmetricMode_mc:2:up'));
      expect(hash('LoadTank_mc:1:up')).not.toBe(hash('LoadTank_mc:1:over'));
      expect(hash('LoadTank_mc:1:over')).toBe(hash('LoadTank_mc:1:down'));
      expect(hash('Undo_mc:1:up')).toBe(hash('Undo_mc:1:over'));
      expect(hash('Undo_mc:1:up')).not.toBe(hash('Undo_mc:2:up'));
      expect(hash('Undo_mc:2:up')).not.toBe(hash('Undo_mc:2:over'));
      expect(hash('handle:1')).not.toBe(hash('handle:2'));
    } else expect(proof.rows).toEqual([]);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'synthetic'}-creator-buttons.png` });
    expect(errors).toEqual([]);
  });
}
