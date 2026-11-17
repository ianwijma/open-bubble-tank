import { expect, test } from '@playwright/test';
test(`mock turret shields follow owner polling and retain old hit instances`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('turret-protection');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-turret-protection'))!);
  expect(proof.removedFilm).toBe(true);
  expect(proof.films).toBe(1);
  expect(proof.oldKey).toBe('shield-hit:turret:launcher:1');
  expect(proof.currentKey).toBe('shield-hit:turret:launcher:2');
  expect(proof.panels.map((panel: { shield: number }) => panel.shield)).toEqual([
    1, 1, 0, 1, 1, 1, 1,
  ]);
  expect(proof.panels[2].clips.map((clip: { kind: string }) => clip.kind)).toEqual(['hit']);
  expect(proof.panels[3].clips.map((clip: { age: number }) => clip.age)).toEqual([7, 0, 1]);
  expect(proof.panels[4].clips.map((clip: { frame: number }) => clip.frame)).toEqual([16, 9, 10]);
  expect(proof.panels[5].clips.map((clip: { frame: number }) => clip.frame)).toEqual([16, 16, 25]);
  expect(proof.cached).toEqual({
    targetIsAvatar: true,
    oldLayerRetainsTurret: true,
    physicalParent: true,
    absentFromCurrent: true,
    counter: 79,
    soundTimer: 7,
    artAdvance: 3,
    shield: 1,
  });
  for (const panel of proof.panels) {
    expect(panel.painted).toEqual(
      panel.clips
        .filter((clip: { kind: string }) => clip.kind === 'film')
        .map((clip: { key: string }) => clip.key),
    );
  }
  await page.locator('#stage').screenshot({ path: `test-results/mock-turret-protection.png` });
  expect(errors).toEqual([]);
});
