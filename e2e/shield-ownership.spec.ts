import { expect, test } from '@playwright/test';
test(`shield mounts retain independent artwork and callback ownership`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('shield-ownership');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-shield-ownership'))!);
  expect(proof.retainedB).toBe(true);
  expect(proof.removedA).toBe(true);
  expect(proof.measurements).toBe(2);
  expect(proof.latestHit).toBe('shield-hit:b');
  expect(proof.pending).toBe(0);
  expect(proof.contact).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  expect(proof.panels.map((p: { shield: number }) => p.shield > 0)).toEqual([
    true,
    true,
    false,
    false,
    true,
    false,
  ]);
  expect(proof.panels[2].life).toBe(19);
  const films = (index: number) =>
    proof.panels[index].clips.filter((clip: { kind: string }) => clip.kind === 'film');
  expect(
    films(1).map((clip: { age: number; diameter: number }) => [clip.age, clip.diameter]),
  ).toEqual([
    [10, 90],
    [0, 150],
  ]);
  expect(films(2).map((clip: { key: string; age: number }) => [clip.key, clip.age])).toEqual([
    ['shield-film:b:1', 15],
  ]);
  expect(films(3)).toEqual([]);
  expect(
    films(4).map((clip: { key: string; diameter: number }) => [clip.key, clip.diameter]),
  ).toEqual([['shield-film:a:2', 90]]);
  for (const panel of proof.panels) {
    const expected = panel.clips
      .filter((clip: { kind: string }) => clip.kind === 'film')
      .map((clip: { key: string }) => clip.key);
    expect(panel.painted).toEqual(expected);
  }
  await page.locator('#stage').screenshot({ path: `test-results/mock-shield-ownership.png` });
  expect(errors).toEqual([]);
});
