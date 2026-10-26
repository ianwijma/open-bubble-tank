import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} projectile contact uses the current alpha point before movement and preserves deflection`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('projectile-order');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-projectile-order'))!);
    expect(
      proof.snapshots.map((s: { life: number; bullets: number }) => [s.life, s.bullets]),
    ).toEqual([
      [100, 1],
      [100, 1],
      [99, 0],
    ]);
    expect(proof.snapshots[1].x).toBeCloseTo(proof.edge);
    expect(proof.snapshots[2].x).toBeCloseTo(proof.edge);
    expect(proof.snapshots[2].effects).toEqual([{ symbol: 1723, x: proof.edge }]);
    expect(proof.massiveWidth).toBeGreaterThan(0);
    expect(proof.deflection).toEqual({
      alive: true,
      x: 15,
      y: 100,
      angle: 90,
      velocity: { x: 10, y: 0 },
    });
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-projectile-order.png` });
    expect(errors).toEqual([]);
  });
