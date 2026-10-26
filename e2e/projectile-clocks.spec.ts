import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} Whip Grow and Flak retain stage clocks through pause`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('projectile-clocks');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-projectile-clocks'))!);
    expect(proof.whip).toEqual({
      frame: 11,
      childFrame: 7,
      age: 0,
      retained: true,
      samplesChanged: true,
    });
    expect(proof.grow.before.scale).toBeCloseTo(1.4);
    expect(proof.grow.before.alpha).toBeCloseTo(0.6);
    expect(proof.grow.before.age).toBe(8);
    expect(proof.grow.after).toEqual({ ...proof.grow.before, frame: proof.grow.before.frame + 6 });
    expect(proof.flak).toEqual({
      frame: 23,
      age: 0,
      blasts: 0,
      ink: 0,
      bounds: { x: 60, y: 0, width: 0, height: 0, empty: true },
      hit: false,
      removed: true,
    });
    expect(proof.sapper).toEqual({ frame: 3, childFrame: 7, age: 0 });
    expect(proof.panels).toHaveLength(6);
    expect(
      proof.panels.every((p: { ink: number; painted: number }) => p.ink > 20 && p.painted > 20),
      JSON.stringify(proof),
    ).toBe(true);
    expect(proof.panels[0].hash).not.toBe(proof.panels[1].hash);
    if (native) expect(proof.panels[2].hash).not.toBe(proof.panels[3].hash);
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
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-projectile-clocks.png` });
    expect(errors).toEqual([]);
  });
