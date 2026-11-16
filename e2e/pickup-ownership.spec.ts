import { expect, test } from '@playwright/test';

test(`mock pickups render physical child order and retain identity through Run mutations`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('pickup-ownership');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-pickup-ownership'))!);
  for (const key of [
    'arrayRetention',
    'uidIndependent',
    'explicitRemoval',
    'lifetimeRetention',
    'reattachedView',
    'pureReads',
  ])
    expect(proof[key], key).toBe(true);
  expect(proof.snapshots.map((s: { order: string[] }) => s.order)).toEqual([
    ['A50', 'B5', 'C1'],
    ['A50', 'B5', 'C1'],
    ['B5', 'C1', 'A50'],
    ['B5', 'C1', 'A50', 'D5'],
    ['C1', 'A50', 'D5'],
    ['C1', 'A50', 'D5', 'B5'],
    ['C1', 'A50', 'D5', 'B5'],
    ['C1', 'A50', 'D5', 'B5'],
  ]);
  expect(proof.snapshots.map((s: { count: number }) => s.count)).toEqual([3, 3, 3, 4, 3, 4, 4, 4]);
  expect(
    proof.playback.map((p: { symbol: number; totalFrames: number }) => [p.symbol, p.totalFrames]),
  ).toEqual([
    [1820, 31],
    [1817, 40],
    [1816, 40],
  ]);
  for (const playback of proof.playback) {
    expect(playback.status).toBe('retained');
    expect(playback.currentFrame).toBe(playback.poseFrame);
    expect(playback.entropy).toBe('host-artwork');
    expect(playback.globalSourceEntropy).toBe('unproved');
  }
  expect(proof.animationFrames.map((f: number[]) => f[0])).toEqual([15, 30]);
  expect(proof.animationFrames[0]).not.toEqual(proof.animationFrames[1]);
  await testInfo.attach('pickup-ownership', {
    body: JSON.stringify(proof, null, 2),
    contentType: 'application/json',
  });
  await page.locator('#stage').screenshot({ path: testInfo.outputPath('pickup-ownership.png') });
  expect(errors).toEqual([]);
});
