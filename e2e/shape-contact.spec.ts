import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test(`contact follows geometric shapes and attached protection rather than painted alpha`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('shape-contact');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-shape-contact'))!);
  writeFileSync(testInfo.outputPath('shape-contact.json'), JSON.stringify(proof, null, 2) + '\n');
  expect(proof.membership).toHaveLength(1);
  for (const control of proof.membership) {
    expect(control.beforeViews).toBeGreaterThan(0);
    expect(control.afterViews).toBe(0);
    expect([control.before, control.after, control.restored, control.logicalStateRetained]).toEqual(
      [true, false, true, true],
    );
  }
  expect(proof.panels).toHaveLength(3);
  const shield = proof.panels.find((p: { label: string }) => p.label.startsWith('Shield'));
  const retained = proof.panels.find((p: { label: string }) => p.label.startsWith('Arrival'));
  expect(shield.damage).toBe(0);
  expect(retained.damage).toBe(1);
  expect(proof.panels.at(-1).detached).toBe(false);
  await page.locator('#stage').screenshot({ path: `test-results/mock-shape-contact.png` });
  expect(errors).toEqual([]);
});
