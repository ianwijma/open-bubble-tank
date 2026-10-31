import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} turret shields follow owner polling and retain old hit instances`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('turret-protection');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-turret-protection'))!);
    expect(proof.retainedHit).toBe(true);
    expect(proof.removedFilm).toBe(true);
    expect(proof.films).toBe(1);
    expect(proof.oldKey).toBe('shield-hit:turret:launcher:1');
    expect(proof.currentKey).toBe('shield-hit:turret:launcher:2');
    expect(proof.panels.map((panel: { shield: number }) => panel.shield)).toEqual([
      1, 1, 0, 1, 1, 1,
    ]);
    expect(proof.panels[2].clips.map((clip: { kind: string }) => clip.kind)).toEqual(['hit']);
    expect(proof.panels[3].clips.map((clip: { age: number }) => clip.age)).toEqual([7, 0, 1]);
    expect(proof.panels[4].clips.map((clip: { frame: number }) => clip.frame)).toEqual([16, 9, 10]);
    expect(proof.panels[5].clips.map((clip: { frame: number }) => clip.frame)).toEqual([
      16, 16, 25,
    ]);
    for (const panel of proof.panels) {
      expect(panel.painted).toEqual(
        panel.clips
          .filter((clip: { kind: string }) => native || clip.kind === 'film')
          .map((clip: { key: string }) => clip.key),
      );
    }
    if (native) expect(proof.oldContact).toEqual({ x: expect.any(Number), y: expect.any(Number) });
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-turret-protection.png` });
    expect(errors).toEqual([]);
  });
