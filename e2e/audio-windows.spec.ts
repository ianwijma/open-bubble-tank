import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test(`mock ready sounds decode with their sample windows`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('audio-windows');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const status = page.locator('#status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-audio-windows'))!);
  writeFileSync(testInfo.outputPath('audio-windows.json'), JSON.stringify(proof, null, 2));
  for (const sound of proof) {
    expect(sound).toMatchObject({ mime: 'audio/wav', signature: 'RIFF', sampleRate: 22050 });
    expect(sound.frames).toBe(sound.headerFrames);
    expect(sound.peak).toBeGreaterThan(0);
  }
  expect(proof).toHaveLength(8);
  expect(errors).toEqual([]);
});
