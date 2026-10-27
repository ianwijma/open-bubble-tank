import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} Buster retains pose and dispatches virtual deflected walls`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('bubble-buster');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-bubble-buster'))!);
    expect(proof.seeker.width).toBeGreaterThan(17);
    expect(proof.seeker).toEqual({
      width: proof.seeker.width,
      copied: { x: 10, y: 0 },
      pauseRetained: true,
      x: 60,
      y: 0,
      angle: 90,
      speed: 3,
      enemy: true,
      dead: false,
    });
    expect(proof.beam).toEqual({ x: 450, dead: false });
    expect(proof.turret).toEqual({ x: 450, dead: false, stopped: true });
    expect(proof.ricochet).toEqual({ x: 420, dead: true, bounces: 2 });
    expect(proof.misses).toEqual([0, 1]);
    expect(proof.panels).toHaveLength(6);
    expect(
      proof.panels.every((p: { ink: number; painted: number }) => p.ink > 20 && p.painted > 20),
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
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-bubble-buster.png` });
    expect(errors).toEqual([]);
  });
