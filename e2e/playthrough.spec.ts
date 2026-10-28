import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} fresh game reaches the boss and win through ordinary controls`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(300000);
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('playthrough');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 280000 });
    const proof = JSON.parse((await status.getAttribute('data-playthrough'))!);
    const evidence = testInfo.outputPath('playthrough-evidence.json');
    writeFileSync(evidence, JSON.stringify(proof, null, 2));
    await testInfo.attach('playthrough-evidence', {
      path: evidence,
      contentType: 'application/json',
    });
    expect(proof).toMatchObject({
      seed: 17,
      mode: 'won',
      bossTriggered: true,
      bossDefeated: true,
      badge: true,
    });
    expect(proof.milestones[0]).toMatchObject({
      frame: 0,
      level: 0,
      life: 1,
      tank: 'A10000063',
      field: '0,0',
    });
    expect([...new Set(proof.upgrades.map((choice: { level: number }) => choice.level))]).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    for (const key of ['kills', 'collected', 'shots', 'visited', 'completed'])
      expect(proof.stats[key]).toBeGreaterThan(0);
    expect(proof.frames).toBe(proof.stats.frames);
    expect(proof.helpClosed).toBe(1);
    const dialog = page.getByRole('dialog', {
      name: "You've Proven Yourself The Greatest!",
      exact: true,
    });
    await expect(dialog.locator('[data-win-age]')).toHaveAttribute('data-win-age', '63');
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-playthrough-win.png` });
    await page
      .locator('#run-history')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-playthrough-history.png` });
    await dialog.getByRole('button', { name: 'Continue Your Game', exact: true }).click();
    await expect(page.locator('#stage')).toHaveAttribute('data-win-action', 'continue');
    expect(errors).toEqual([]);
  });
