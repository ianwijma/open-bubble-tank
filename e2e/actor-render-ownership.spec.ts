import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';

const swf = process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} renderer follows actual actor objects, parents, order and child presence`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('actor-render-ownership');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.locator('#status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-actor-render-ownership'))!);
    writeFileSync(
      testInfo.outputPath('actor-render-ownership.json'),
      JSON.stringify(proof, null, 2),
    );
    await page
      .locator('#stage > canvas')
      .screenshot({ path: testInfo.outputPath('actor-render-ownership.png') });
    expect(proof.panels[0].order).toEqual([
      'enemy A',
      'ally B',
      'enemy C',
      'display only',
      'avatar',
    ]);
    expect(proof.panels[1].order).toEqual([
      'ally B',
      'enemy C',
      'display only',
      'enemy A',
      'avatar',
    ]);
    expect(proof.panels[2].order).toEqual(proof.panels[1].order);
    expect(proof.panels[3].order).toEqual([
      'enemy C',
      'display only',
      'enemy A',
      'ally B',
      'avatar',
    ]);
    for (const key of [
      'pureReads',
      'stableViews',
      'raisedRetained',
      'reparented',
      'reparentRetained',
      'detachedDestroyed',
      'unrelatedRetained',
      'reattachedFresh',
      'emptyRemoved',
      'deadChildrenRetained',
      'rawAliasPreserved',
      'statusRetained',
      'statusWiped',
      'partDetached',
      'partReattached',
    ])
      expect(proof[key], key).toBe(true);
    expect(proof.reparentX).toBe(415);
    expect(proof.displayOnlyArtDelta).toBe(1);
    expect(proof.identity).toEqual({ distinct: true, count: 2 });
    expect(proof.empty).toEqual({ retained: true, parented: true, children: 0 });
    expect(proof.livePaint.ink).toBeGreaterThan(50);
    expect(proof.deadPaint).toEqual(proof.livePaint);
    expect(proof.livePaint.children).toContain('forcefield');
    expect(proof.livePaint.children).toContain('shield-film:p1:1');
    if (native) {
      expect(proof.statusKeys).toContain('status');
      expect(proof.livePaint.children).toContain('infection');
      expect(proof.livePaint.children).toContain('shield-hit:p1');
    }
    expect(proof.statusDeadPaint.ink).toBeGreaterThan(20);
    expect(proof.statusWipedPaint).toEqual({ ink: 0, children: [] });
    expect(proof.wipedPaint).toEqual({ ink: 0, children: [] });
    expect(errors).toEqual([]);
  });
