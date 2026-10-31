import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} forcefield reorders existing artwork and preserves the arrival film`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('forcefield-order');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-forcefield-order'))!);
    expect(proof.retained).toBe(true);
    expect(proof.generation).toBe(1);
    expect(proof.panels.map((p: { ready: boolean }) => p.ready)).toEqual([
      false,
      false,
      false,
      true,
      false,
      true,
      true,
      true,
    ]);
    expect(proof.panels[1].order.slice(-3)).toEqual([
      'forcefield',
      'shield-hit:mount-1',
      'shield-film:mount-1:1',
    ]);
    expect(proof.panels[2].order).toEqual(proof.panels[1].order);
    expect(proof.panels[3].order.slice(-3)).toEqual([
      'shield-hit:mount-1',
      'shield-film:mount-1:1',
      'forcefield',
    ]);
    expect(proof.panels[3].debt).toBe(-15);
    for (const i of [4, 5]) {
      expect(proof.panels[i].shield).toBe(0);
      expect(proof.panels[i].order).toContain('shield-film:mount-1:1');
    }
    expect(proof.panels[5].filmAge - proof.panels[4].filmAge).toBe(30);
    expect(proof.panels[6].order.slice(-2)).toEqual(['forcefield', 'infection']);
    expect(proof.panels[7].order.slice(-2)).toEqual(['infection', 'forcefield']);
    if (native)
      for (const panel of proof.panels) {
        // An invisible forcefield mask is mounted beside its splash under the same key.
        expect(panel.painted.filter((key: string) => panel.order.includes(key))).toEqual(
          panel.order,
        );
        expect(panel.ink).toBeGreaterThan(20);
      }
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-forcefield-order.png` });
    expect(errors).toEqual([]);
  });
