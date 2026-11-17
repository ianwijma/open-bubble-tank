import { expect, test } from '@playwright/test';
test(`mock failed Healer target read aborts one Run while stage frames and beam recovery continue`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('healer-targets');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-healer-targets'))!);
  expect(proof.normal.target).toBe(true);
  expect(proof.normal.beamTarget).toBe(true);
  expect(proof.normal.beams).toBe(1);
  expect(proof.normal.life).toBeGreaterThan(50);
  expect(proof.before).toEqual({
    frames: 1,
    owner: 1,
    sentinel: 0,
    ownerArt: 1,
    sentinelArt: 1,
    callbacks: 1,
    beams: 0,
    target: false,
  });
  expect(proof.after).toEqual({
    frames: 4,
    owner: 4,
    sentinel: 3,
    ownerArt: 4,
    sentinelArt: 4,
    callbacks: 4,
    beams: 1,
    target: true,
  });
  await page.locator('#stage').screenshot({ path: `test-results/mock-healer-targets.png` });
  expect(errors).toEqual([]);
});
