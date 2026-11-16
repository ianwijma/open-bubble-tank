import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
// The full post-merge suite has a larger hosted wall-clock budget. The pilot's
// inputs, simulated frames, frame cap and all earned-progression assertions stay fixed.
const playthroughTimeout = process.env.BT3_PLAYTHROUGH_LONG_RUN === '1' ? 600000 : 300000;
test(`mock fresh game reaches the boss and win through ordinary controls`, async ({
  page,
}, testInfo) => {
  test.setTimeout(playthroughTimeout);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('playthrough');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: playthroughTimeout - 20000 });
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
  await page.locator('#stage').screenshot({ path: `test-results/mock-playthrough-win.png` });
  await page
    .locator('#run-history')
    .screenshot({ path: `test-results/mock-playthrough-history.png` });
  await dialog.getByRole('button', { name: 'Continue Your Game', exact: true }).click();
  await expect(page.locator('#stage')).toHaveAttribute('data-win-action', 'continue');
  expect(errors).toEqual([]);
});
