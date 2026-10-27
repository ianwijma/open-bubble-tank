import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} collapse retains its field pivot, separate layers and isolated knockout composition`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the original local SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('collapse');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-collapse'))!);
    expect(proof.snapshots.map((s: { age: number; frame: number }) => [s.age, s.frame])).toEqual([
      [0, 1],
      [51, 51],
      [119, 119],
    ]);
    for (const s of proof.snapshots) {
      const scale = 1 - s.age / 204;
      expect(s.camera).toBe(0.75);
      expect(s.center.x).toBeCloseTo(170, 5);
      expect(s.center.y).toBeCloseTo(277.5, 5);
      expect(s.avatar.x).toBeCloseTo(170 + 140 * scale * 0.75, 5);
      expect(s.avatar.y).toBeCloseTo(277.5 - 70 * scale * 0.75, 5);
      expect(s.avatarScale).toBeCloseTo(scale, 5);
      expect(s.fieldWidth / proof.snapshots[0].fieldWidth).toBeCloseTo(scale, 5);
      expect(s.retainedPosition).toEqual({ x: -105, y: 52.5 });
      if (native) {
        expect(s.shot.x).toBeCloseTo(170 + 60 * scale * 0.75, 5);
        expect(s.shot.y).toBeCloseTo(277.5 + 80 * scale * 0.75, 5);
        expect(s.bottom.x).toBeCloseTo(100 * scale ** 2, 5);
        expect(s.bottom.y).toBeCloseTo(40 * scale ** 2, 5);
        expect(s.bottom.scale).toBeCloseTo(scale ** 2, 5);
        expect(s.top.x).toBeCloseTo(100 * scale, 5);
        expect(s.top.y).toBeCloseTo(40 * scale, 5);
        expect(s.top.scale).toBeCloseTo(scale, 5);
      } else expect(s.mockShotScale).toBeCloseTo(scale, 5);
    }
    expect(proof.completed).toEqual({ mode: 'transit', hasCollapse: false, shake: 0, flash: true });
    expect(proof.erase).toEqual({
      center: [255, 0, 0, 255],
      ring: [0, 0, 255, 255],
      outside: [255, 0, 0, 255],
    });
    for (const sample of proof.glow)
      for (let channel = 0; channel < 4; channel++)
        expect(
          Math.abs(sample.actual[channel] - sample.expected[channel]),
          JSON.stringify(sample),
        ).toBeLessThanOrEqual(2);
    if (native) expect(proof.nativeErase).toBe(12);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-collapse.png` });
    expect(errors).toEqual([]);
  });
