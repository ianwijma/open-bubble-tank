import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} beam samples the shell-cleared raw enemy before next-frame removal`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('beam-contracts');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-beam-contracts'))!);
    expect(
      proof.snapshots.map(
        (s: {
          first: number;
          life: number;
          contactFrames: number;
          rawCount: number;
          victimParent: boolean;
        }) => [s.first, s.life, s.contactFrames, s.rawCount, s.victimParent],
      ),
    ).toEqual([
      [27, 100, 1, 2, true],
      [77, 99, 0, 1, false],
    ]);
    for (const snapshot of proof.snapshots) {
      expect(snapshot.victimDead).toBe(true);
      expect(snapshot.victimEmpty).toBe(true);
      expect(snapshot.speed).toBe(0);
      expect(snapshot.beamPixels).toBeGreaterThan(50);
    }
    expect(proof.snapshots[0].beamLength).not.toBe(proof.snapshots[1].beamLength);
    expect(proof.carrier).toEqual({
      life: 99,
      dead: false,
      mounts: 1,
      excludedLife: 100,
      seekers: 0,
    });
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-beam-contracts.png` });
    expect(errors).toEqual([]);
  });
