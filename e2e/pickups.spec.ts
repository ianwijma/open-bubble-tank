import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} pickups move into visible tank artwork before the following collection phase`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('pickups');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const { edge, snapshots } = JSON.parse((await status.getAttribute('data-pickups'))!);
    expect(edge).toBeGreaterThan(6);
    expect(snapshots.map((snapshot: { life: number }) => snapshot.life)).toEqual([1, 1, 6]);
    expect(snapshots.map((snapshot: { count: number }) => snapshot.count)).toEqual([1, 1, 0]);
    expect(snapshots[0].contact).toBe(false);
    expect(snapshots[1].contact).toBe(true);
    expect(snapshots[1].x).toBeCloseTo(snapshots[0].x - 14);
    if (native) {
      expect(snapshots.map((snapshot: { nativeCount: number }) => snapshot.nativeCount)).toEqual([
        1, 1, 0,
      ]);
      expect(snapshots[0].nativeAngle).toBeCloseTo(35);
    }
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-pickup-contact.png` });
    expect(errors).toEqual([]);
  });
