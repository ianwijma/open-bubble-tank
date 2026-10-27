import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} tank art uses independent paused clocks and protection geometry`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('tank-art');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-tank-art'))!);
    expect(proof.live).toEqual({ age: 0, artAge: 12, poseAge: native ? 13 : null, retained: true });
    expect(proof.hit.hitAge).toBe(3);
    if (native) {
      expect(proof.hit.remainingHitInk).toBeGreaterThan(20);
      expect(proof.hit.actualScale).toBeCloseTo(proof.hit.expectedScale);
      expect(proof.centeredScale).toBe(1); // ignored NaN width preserves authored scale.
      expect(proof.panels[0].hash).not.toBe(proof.panels[1].hash);
      expect(proof.panels[4].hash).not.toBe(proof.panels[5].hash);
      // Frame2's tiny gradient ring is at x73 before scaling, outside this clone mask.
      expect(proof.panels[4].ink).toBe(0);
    }
    expect(proof.forcefield).toMatchObject({
      age: 0,
      artAge: 12,
      frame: 14,
      cloneAge: native ? 13 : null,
      retained: true,
    });
    expect(proof.forcefield.radius).toBe(proof.forcefield.cachedRadius);
    expect(proof.panels).toHaveLength(6);
    expect(
      proof.panels
        .filter((_: unknown, i: number) => i !== (native ? 4 : 3))
        .every((p: { ink: number; painted: number }) => p.ink > 20 && p.painted > 20),
      JSON.stringify(proof),
    ).toBe(true);
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
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-tank-art.png` });
    expect(errors).toEqual([]);
  });
