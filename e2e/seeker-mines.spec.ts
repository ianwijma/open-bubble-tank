import { expect, test } from '@playwright/test';
test(`mock seeker mines use rectangle contact and animate through paused simulation`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('seeker-mines');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-seeker-mines'))!);
  expect(proof.contact).toEqual({
    rectangleContact: true,
    pixelContacts: [false, false, false],
    mineAlive: false,
    incomingAlive: true,
    effects: [1834, 1723],
  });
  expect(proof.animation.pausedFrame).not.toBe(proof.animation.firstFrame);
  expect(proof.animation).toMatchObject({ endFrame: 55, heldFrame: 55, age: 0, x: 140, y: 20 });
  expect(proof.mineBounds.width).toBeGreaterThan(0);
  expect(proof.mineBounds.height).toBeGreaterThan(0);
  expect(
    proof.galleryInk.every((ink: number) => ink > 0),
    JSON.stringify(proof),
  ).toBe(true);
  await page.locator('#stage').screenshot({ path: `test-results/mock-seeker-mines.png` });
  expect(errors).toEqual([]);
});
