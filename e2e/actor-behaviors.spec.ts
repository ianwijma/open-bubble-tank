import { expect, test } from '@playwright/test';
test(`mock live actor movement and ordered behaviors run through production drawing`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('actor-behaviors');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-actor-behaviors'))!);
  expect(proof.samples.map((s: { frame: number }) => s.frame)).toEqual([0, 1, 2, 3, 30, 120]);
  const first = proof.samples[1].tanks;
  expect([first[0].x, first[0].y]).toEqual([-250, -98]);
  expect([first[0].rotation, proof.samples[2].tanks[0].rotation]).toEqual([90, 90]);
  expect([first[0].y, proof.samples[2].tanks[0].y, proof.samples[3].tanks[0].y]).toEqual([
    -98, -96, -94,
  ]);
  expect(proof.samples[3].tanks[0].rotation).toBeLessThan(90);
  expect(proof.samples[2].tanks[2].destination).toEqual(first[2].destination);
  expect(first[0].destination).toEqual({ x: 0, y: 0 });
  expect(first[1].skittish).toBe(true);
  expect(Math.hypot(first[1].destination.x, first[1].destination.y)).toBeCloseTo(700, 10);
  expect(first[2].wall).toBe(true);
  expect(first[2].wallAge).toBe(0);
  expect(first[3].counter).toBe(proof.samples[0].tanks[3].counter + 1);
  expect(first[4].destination).toEqual({ x: first[0].x, y: first[0].y });
  expect(proof.samples[5].tanks[2].wallAge).toBe(119);
  expect(proof.samples[5].tanks[0].x).not.toBe(first[0].x);
  expect(proof.paused).toEqual(proof.before);
  await page.locator('#stage').screenshot({ path: `test-results/mock-live-actor-behaviors.png` });
  expect(errors).toEqual([]);
});
