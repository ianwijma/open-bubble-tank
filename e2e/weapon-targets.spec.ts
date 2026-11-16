import { expect, test } from '@playwright/test';
test(`mock mounted guns retain separate targets and fire the preceding aim on ally-count retarget`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('weapon-targets');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-weapon-targets'))!);
  expect(proof.snapshots.map((s: { shots: number }) => s.shots)).toEqual([2, 4, 6]);
  expect(proof.snapshots[0].targets).toEqual([proof.ally, proof.player]);
  expect(proof.snapshots[1].targets).toEqual([proof.player, proof.player]);
  expect(proof.snapshots[0].angles[0]).toBeCloseTo((Math.atan2(110, 180) * 180) / Math.PI);
  expect(proof.snapshots[0].angles[1]).toBeCloseTo((Math.atan2(-90, 260) * 180) / Math.PI);
  expect(proof.snapshots[1].shotAngles).toEqual(proof.snapshots[0].angles);
  expect(proof.snapshots[2].angles[0]).toBeCloseTo((Math.atan2(-70, 260) * 180) / Math.PI);
  await page.locator('#stage').screenshot({ path: `test-results/mock-weapon-targets.png` });
  expect(errors).toEqual([]);
});
