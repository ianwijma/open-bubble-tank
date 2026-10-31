import { waitForMainMenu } from './helpers/main-menu';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign, TankPart } from '../src/game/core/types';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const starter: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} frozen class samples exclude weapons and retain source poster states`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('part-snapshots');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-part-snapshots'))!);
    const samples = new Map<
      string,
      { pixels: number; classId: number; width: number; height: number }
    >(proof.classes.map((s: { label: string }) => [s.label, s]));
    expect(samples.get('empty')).toMatchObject({ pixels: 0, classId: 1, width: 10, height: 10 });
    expect(samples.get('weapons-only')).toEqual(
      samples.get('empty') && { ...samples.get('empty'), label: 'weapons-only' },
    );
    for (const [count, classId] of [
      [1, 1],
      [2, 2],
      [4, 3],
      [8, 5],
      [12, 6],
    ]) {
      const body = samples.get(`bodies-${count}`)!,
        armed = samples.get(`armed-${count}`)!;
      expect(body.classId, JSON.stringify(proof)).toBe(classId);
      expect(armed).toEqual({ ...body, label: `armed-${count}` });
    }
    const body = samples.get('bodies-4')!;
    for (const name of ['translated', 'wrong-stored-radius']) {
      const sample = samples.get(name)!;
      expect([sample.pixels, sample.classId, sample.width, sample.height]).toEqual([
        body.pixels,
        body.classId,
        body.width,
        body.height,
      ]);
    }
    expect(samples.get('overlap')!.classId).toBe(1);
    if (native)
      expect(proof.posters).toEqual({
        emptyIdleCharge: true,
        rawChargeVisible: true,
        stoppedRotor: true,
        rawRotorShifted: true,
        positiveClusterMatchesPose: true,
        rawUnchanged: true,
      });
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-part-snapshots.png` });
    expect(errors).toEqual([]);
  });

  test(`${native ? 'SWF' : 'mock'} creator derives body class despite a large mounted weapon`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click({ timeout: 60000 });
    const bodies: TankPart[] = Array.from({ length: 4 }, (_, i) => ({
      ...starter.parts[0],
      key: `body-${i}`,
      type: 1004,
      x: i * 70 - 105,
      y: 0,
      scale: 1,
      radius: 28.75,
    }));
    const design: TankDesign = {
      ...starter,
      id: 'L10000001',
      name: 'Body class fixture',
      avatar: false,
      classId: 6,
      parts: [...bodies, { ...bodies[0], key: 'gun', type: 4013, x: 0, y: -80, scale: 3 }],
    };
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'body-class.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(design)),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.locator('.creator-meters > div').first()).toContainText('Class 3');
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exported: TankDesign = JSON.parse(readFileSync((await (await pending).path())!, 'utf8'));
    expect(exported.classId).toBe(3);
    expect(exported.parts).toHaveLength(5);
    await page.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-creator-body-class.png`,
    });
  });
}
