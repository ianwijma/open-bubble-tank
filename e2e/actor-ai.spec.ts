import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} actor movement uses source delayed turns and active behavior clocks`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('actor-ai');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-actor-ai'))!);
    expect(proof.snapshots.map((s: { frame: number }) => s.frame)).toEqual([0, 1, 2, 3, 50, 160]);
    const first = proof.snapshots[1].actors[0],
      second = proof.snapshots[2].actors[0],
      third = proof.snapshots[3].actors[0];
    expect([first.rotation, second.rotation]).toEqual([90, 90]);
    expect([first.y, second.y, third.y]).toEqual([-98, -96, -94]);
    expect(first.point).toEqual({ x: 0, y: 0 });
    expect(third.rotation).toBeLessThan(90);
    expect(proof.snapshots[1].actors[2].point).toEqual(proof.snapshots[2].actors[2].point);
    expect(proof.snapshots[4].actors[3].alpha).toBeCloseTo(0);
    expect(proof.snapshots[5].actors[3].alpha).toBeCloseTo(0.2);
    expect(proof.beforePause).toEqual(proof.afterPause);
    expect(proof.wall.frequency).toBeGreaterThanOrEqual(0.02);
    expect(proof.wall.frequency).toBeLessThanOrEqual(0.1);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-actor-ai.png` });
    expect(errors).toEqual([]);
  });
