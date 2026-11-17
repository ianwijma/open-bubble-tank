import { expect, test } from '@playwright/test';
test(`mock projectile contact uses the current alpha point before movement and preserves deflection`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('projectile-order');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-projectile-order'))!);
  expect(
    proof.snapshots.map((s: { life: number; bullets: number }) => [s.life, s.bullets]),
  ).toEqual([
    [100, 1],
    [100, 1],
    [99, 0],
  ]);
  expect(proof.snapshots[1].x).toBeCloseTo(proof.edge);
  expect(proof.snapshots[2].x).toBeCloseTo(proof.edge);
  expect(proof.snapshots[2].effects).toEqual([{ symbol: 1723, x: proof.edge }]);
  expect(proof.massiveWidth).toBeGreaterThan(0);
  const before = proof.beforeDeflection,
    setupAngle = (360 * Math.atan2(before.aimDelta.y, before.aimDelta.x)) / (2 * Math.PI);
  expect(before.initialized).toBe(true);
  expect([before.x, before.y]).toEqual([5, 100]);
  expect(before.aimDelta).toEqual({ x: -5, y: -100 });
  expect(before.angle).toBeCloseTo(setupAngle);
  expect(before.angle).not.toBe(90); // Setup aims before Buster can preserve the pose.
  expect(before.motion.x).toBeCloseTo(Math.cos((Math.PI * setupAngle) / 180) * 10);
  expect(before.motion.y).toBeCloseTo(Math.sin((Math.PI * setupAngle) / 180) * 10);
  expect(proof.deflection).toEqual({
    alive: true,
    x: 15,
    y: 100,
    angle: before.angle,
    velocity: { x: 10, y: 0 },
  });
  await page.locator('#stage').screenshot({ path: `test-results/mock-projectile-order.png` });
  expect(errors).toEqual([]);
});
