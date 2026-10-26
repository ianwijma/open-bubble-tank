import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} crossing renders both live field populations and retains the destination`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('crossing-combat');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-crossing'))!);
    expect(proof.retained).toBe(true);
    expect(proof.abandoned).toBe(true);
    expect(proof.snapshots.map((s: { mode: string }) => s.mode)).toEqual([
      'transit',
      'transit',
      'transit',
      'playing',
    ]);
    for (const [index, snapshot] of proof.snapshots.entries()) {
      expect(snapshot.bullets).toHaveLength(index === 3 ? 1 : 2);
      if (index < 3)
        expect(snapshot.bullets.map((b: { age: number }) => b.age)).toEqual([
          index * 10,
          index * 10,
        ]);
      for (const actor of snapshot.actors)
        expect(snapshot.renderedTanks).toContainEqual({ x: actor.x, y: actor.y });
      if (native)
        for (const bullet of snapshot.bullets)
          expect(snapshot.renderedShots).toContainEqual({ x: bullet.x, y: bullet.y });
    }
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-active-crossing.png` });
    expect(errors).toEqual([]);
  });
