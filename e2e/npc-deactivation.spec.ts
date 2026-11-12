import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';

const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} NPC death contact and boundary exits retain ordered final callbacks and sound events`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('npc-deactivation');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-npc-deactivation'))!);
    writeFileSync(testInfo.outputPath('npc-deactivation.json'), JSON.stringify(proof, null, 2));
    expect(proof.map((entry: { name: string }) => entry.name)).toEqual([
      'enemy damage',
      'ally damage',
      'enemy boundary',
      'ally boundary',
      'swarm boundary',
      'mine ally boundary',
    ]);
    for (const [index, entry] of proof.entries()) {
      const enemy = index === 0 || index === 2;
      expect(entry).toMatchObject({
        dead: true,
        dataActive: false,
        life: 0,
        parented: true,
        kills: enemy ? 1 : 0,
        sumo: index === 2 ? 1 : 0,
      });
      if (index < 2) expect(entry.contact).toBe(true);
      expect(entry.events).toContain(index === 1 ? 'death' : 'pop');
      expect(entry.events).not.toContain(index === 1 ? 'pop' : 'death');
      expect(entry.events.includes('hit')).toBe(index === 0);
      const kinds =
        index < 4 ? [...(enemy ? ['infect', 'infect'] : []), ...Array(6).fill('seekerMine')] : [];
      expect(entry.births.map((birth: { kind: string }) => birth.kind)).toEqual(kinds);
      for (const birth of entry.births) {
        expect(birth).toMatchObject({
          active: true,
          dead: false,
          queued: false,
          enemy: birth.kind === 'seekerMine',
        });
      }
      if (index < 2) {
        expect(entry.minePixels).toBeGreaterThan(10);
        expect(entry.expiredMines).toBe(0);
      } else {
        // Boundary-born mines enter the same live bullet loop and immediately hit the wall.
        expect(entry.minePixels).toBe(0);
        expect(entry.expiredMines).toBe(index < 4 ? 6 : 0);
      }
    }
    const gallery = page.locator('#stage > canvas');
    await expect.poll(async () => (await gallery.boundingBox())?.height).toBe(675);
    await gallery.screenshot({ path: testInfo.outputPath('npc-deactivation.png') });
    expect(errors).toEqual([]);
  });
