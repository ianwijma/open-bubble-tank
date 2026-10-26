import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} special projectiles use fresh shots, source phases and stopped state artwork`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('special-projectiles');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-special-projectiles'))!);
    expect(proof.burst).toEqual({ count: 36, unlimited: true, fresh: true });
    expect(proof.spin.count).toBe(4);
    expect(proof.spin.unlimited).toBe(true);
    expect(new Set(proof.spin.speeds).size).toBeGreaterThan(1);
    expect(proof.fade.alpha).toBeCloseTo(0.6);
    expect(proof.fade.alive).toBe(true);
    expect(proof.sap).toEqual({ returning: true, frame: 2, life: 37, x: -3 });
    expect(proof.conversion).toMatchObject({
      count: 1,
      symbol: 1827,
      removedOriginal: true,
      fresh: true,
      unlimited: true,
      flags: { seeker: false, destroyable: false, rotatesTowardTarget: true },
    });
    expect(proof.panels).toHaveLength(6);
    expect(
      proof.panels.every((panel: { ink: number }) => panel.ink > 20),
      JSON.stringify(proof),
    ).toBe(true);
    expect(
      proof.panels.every((panel: { painted: number }) => panel.painted > 20),
      JSON.stringify(proof),
    ).toBe(true);
    if (native) {
      expect(proof.panels.map((panel: { nativeCount: number }) => panel.nativeCount)).toEqual([
        1, 36, 5, 1, 1, 1,
      ]);
      expect(proof.fade.nativeAlpha).toBeCloseTo(0.6);
    }
    const displayedHash = await page.locator('#stage canvas').evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = element as HTMLCanvasElement;
      let hash = 2166136261;
      for (const byte of canvas.getContext('2d')!.getImageData(0, 0, 550, 450).data)
        hash = Math.imul(hash ^ byte, 16777619);
      return hash >>> 0;
    });
    expect(displayedHash).toBe(proof.galleryHash);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-special-projectiles.png` });
    expect(errors).toEqual([]);
  });
