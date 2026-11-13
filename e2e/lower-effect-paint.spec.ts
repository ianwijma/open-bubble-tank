import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const original = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/lower-effect-paint-original.json', import.meta.url),
    'utf8',
  ),
) as { points: number[][]; samples: { pixels: number[] }[] };
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} lower effects follow their actual field mask and retain identity through reparenting`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the original local SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('lower-effect-paint');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse(
      (await page.locator('#status').getAttribute('data-lower-effect-paint'))!,
    );
    expect(proof.results.map((r: { i: number }) => r.i)).toEqual(original.samples.map((_, i) => i));
    const differences = [];
    for (const row of proof.results as { i: number; pixels: number[][] }[]) {
      expect(row.pixels).toHaveLength(original.points.length);
      for (const [j, pixel] of row.pixels.entries()) {
        const expected = original.samples[row.i].pixels[j];
        if (
          expected === 0
            ? pixel[3] > 32
            : pixel[3] < 240 ||
              pixel.slice(0, 3).some((v, k) => Math.abs(v - [187, 217, 242][k]) > 3)
        )
          differences.push({ i: row.i, point: original.points[j], expected, pixel });
      }
    }
    expect(differences).toEqual([]);
    expect(proof.pure).toBe(true);
    expect(proof.game.masked.painted).toBeGreaterThan(5);
    expect(proof.game.masked.outside).toBe(0);
    expect(proof.game.bare.outside).toBeGreaterThan(5);
    for (const key of ['pure', 'stable', 'reparented', 'disposed'])
      expect(proof.game[key], key).toBe(true);
    expect(errors).toEqual([]);
    writeFileSync(testInfo.outputPath('lower-effect-proof.json'), JSON.stringify(proof, null, 2));
    for (const [name, data] of [
      ['clipped', proof.clippedPaint],
      ['production-masked', proof.game.masked.png],
      ['production-bare', proof.game.bare.png],
    ])
      writeFileSync(testInfo.outputPath(name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  });
