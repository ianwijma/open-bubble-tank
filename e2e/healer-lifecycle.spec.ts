import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} Healer beams retain homes while dead patients lose their paint`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('healer-lifecycle');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-healer-lifecycle'))!);
    writeFileSync(testInfo.outputPath('healer-lifecycle.json'), JSON.stringify(proof, null, 2));
    expect(proof.owners.map((owner: { mode: string }) => owner.mode)).toEqual([
      'healthy',
      'killed',
      'jammed',
    ]);
    for (const owner of proof.owners) {
      expect(owner.patientLife).toBe(51);
      expect(owner.ownerDead).toBe(owner.mode === 'killed');
      expect(owner.ownerParented).toBe(true);
      expect(owner.beamRetained).toBe(true);
      expect(owner.directHome).toBe(true);
      expect(owner.beamCounter).toBe(0);
      expect(owner.beamPixels).toBeGreaterThan(50);
      if (owner.mode === 'killed') {
        expect(owner.detachedNext).toBe(true);
        expect(owner.beamRemovedNext).toBe(true);
      }
    }
    expect(proof.patientDeath).toMatchObject({
      dead: true,
      life: 0,
      dataActive: false,
      parented: true,
      children: 0,
      painted: false,
      counter: 10,
      laterBulletAge: 1,
      avatarAge: 1,
      callbacks: 1,
    });
    expect(proof.removal).toEqual({
      parented: false,
      beamRetained: false,
      laterBulletAge: 1,
      avatarAge: 2,
      callbacks: 2,
    });
    expect(proof.recovered).toEqual({ laterBulletAge: 2, avatarAge: 3, callbacks: 3 });
    const gallery = page.locator('#stage > canvas');
    await expect.poll(async () => (await gallery.boundingBox())?.height).toBe(675);
    await gallery.screenshot({ path: testInfo.outputPath('healer-lifecycle.png') });
    expect(errors).toEqual([]);
  });
