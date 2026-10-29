import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} homing keeps independent movement, delayed aim and close contact`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('homing-projectiles');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-homing-projectiles'))!);
    expect(proof.initialMotion).toEqual({ x: 3, y: 0 });
    expect(proof.frames.map((frame: { angle: number }) => frame.angle)).toEqual([90, 95, 140]);
    expect(
      proof.frames.every(
        (frame: { motion: { x: number; y: number } }) =>
          frame.motion.x === 3 && frame.motion.y === 0,
      ),
    ).toBe(true);
    const first = proof.frames[1],
      radius = proof.radius + 10;
    expect(first.x).toBeCloseTo(Math.cos((5 * Math.PI) / 180) * radius + 3);
    expect(first.y).toBeCloseTo(Math.sin((5 * Math.PI) / 180) * radius);
    expect(proof.acquired.uid).toBe(proof.patient);
    expect(proof.acquired.angle).toBe(145);
    expect(proof.pursuit.angle).toBeCloseTo(
      (Math.atan2(-60 - proof.acquired.y, 100 - proof.acquired.x) * 180) / Math.PI,
    );
    expect(proof.close).toEqual({ paintedContact: false, dead: true, life: 93 });
    expect(proof.panels.every((panel: { ink: number }) => panel.ink > 30)).toBe(true);
    expect(new Set(proof.panels.map((panel: { hash: number }) => panel.hash)).size).toBe(3);
    expect(proof.launch).toHaveLength(2);
    expect(Math.abs(proof.launch[0].width - proof.launch[1].width)).toBeGreaterThan(30);
    for (const launch of proof.launch) expect(launch.distance).toBeCloseTo(launch.width / 2 + 10);
    expect(proof.status.nextRoot).toBe(proof.status.root);
    expect(proof.status.nextChild).not.toBe(proof.status.child);
    if (native) expect(proof.statusPanels[0]).not.toBe(proof.statusPanels[1]);
    expect(proof.forcefield.withField).toBeGreaterThan(proof.forcefield.withoutField + 20);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-homing-projectiles.png` });
    expect(errors).toEqual([]);
  });
