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
    expect(proof.detachedRuntimeRetained).toBe(true);
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

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} replaced next wrapper keeps its stage pose and artwork without combat Run`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('crossing-nested');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-crossing'))!);
    expect(proof.logicalPosition).toEqual({ col: 2, row: 0 });
    expect(proof.abandonedIsCurrent).toBe(false);
    expect(proof.abandonedIsNext).toBe(false);
    expect(proof.snapshots.map((s: { age: number }) => s.age)).toEqual([0, 0]);
    expect(proof.snapshots[1].artAge - proof.snapshots[0].artAge).toBe(3);
    expect(proof.snapshots[1].expected).toEqual(proof.snapshots[0].expected);
    for (const snapshot of proof.snapshots) {
      expect(snapshot).toMatchObject({ onStage: true, attached: 3, active: 2 });
      expect(snapshot.rendered).toHaveLength(2);
      expect(
        snapshot.rendered.some(
          (point: { x: number; y: number }) =>
            Math.abs(point.x - snapshot.expected.x) < 0.001 &&
            Math.abs(point.y - snapshot.expected.y) < 0.001,
        ),
      ).toBe(true);
      expect(snapshot.bodyPixels).toBeGreaterThan(50);
    }
    await page
      .locator('#stage > canvas')
      .screenshot({ path: testInfo.outputPath('nested-crossing.png') });
    expect(errors).toEqual([]);
  });
