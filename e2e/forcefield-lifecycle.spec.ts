import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} forcefield detaches on crossing and reconstructs after passive Run`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('forcefield-lifecycle');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-forcefield-lifecycle'))!);
    expect(proof.panels.map((p: { attached: boolean }) => p.attached)).toEqual([
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(proof.panels.map((p: { generation: number }) => p.generation)).toEqual([
      0, 0, 0, 0, 1, 1,
    ]);
    for (const i of [1, 2, 3]) expect(proof.panels[i].ink).toBe(0);
    for (const i of [0, 5]) expect(proof.panels[i].ink).toBeGreaterThan(20);
    expect(proof.fresh).toMatchObject({
      generation: 1,
      origin: 21,
      artAge: 22,
      cloneAge: native ? 2 : null,
      replaced: true,
      oldDestroyed: true,
      liveRetained: true,
    });
    expect(proof.oldCloneAge).toBe(native ? 13 : null);
    expect(proof.finalCloneAge).toBe(native ? 14 : null);
    if (native) expect(proof.fresh.children).toBe(2);
    expect(proof.ready).toBe(true);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-forcefield-lifecycle.png` });
    expect(errors).toEqual([]);
  });
