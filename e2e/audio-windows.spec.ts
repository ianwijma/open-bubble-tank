import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';

const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} ready sounds decode with their source sample windows`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('audio-windows');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-audio-windows'))!);
    writeFileSync(testInfo.outputPath('audio-windows.json'), JSON.stringify(proof, null, 2));
    for (const sound of proof) {
      expect(sound).toMatchObject({ mime: 'audio/wav', signature: 'RIFF', sampleRate: 22050 });
      expect(sound.frames).toBe(sound.headerFrames);
      expect(sound.peak).toBeGreaterThan(0);
    }
    if (native) {
      expect(proof).toHaveLength(18);
      for (const id of [561, 563]) {
        const sound = proof.find((sound: { id: number }) => sound.id === id);
        expect(sound.frames).toBe(2304);
        expect(sound.duration).toBeCloseTo(2304 / 22050, 8);
      }
      expect(proof.find((sound: { id: number }) => sound.id === 566).frames).toBe(25920);
    } else expect(proof).toHaveLength(8);
    expect(errors).toEqual([]);
  });
