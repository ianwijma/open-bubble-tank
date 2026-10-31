import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} contact follows geometric shapes and attached protection rather than painted alpha`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('shape-contact');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    const status = page.getByRole('status');
    await expect(status).toContainText('Ready', { timeout: 60000 });
    const proof = JSON.parse((await status.getAttribute('data-shape-contact'))!);
    expect(proof.primitives.results).toEqual({
      opaque: true,
      hidden: true,
      alphaZero: true,
      placementAlphaZero: true,
      transparentFill: true,
      transparentStroke: true,
      maskInside: true,
      maskOutside: false,
      maskOnly: false,
      removed: false,
    });
    expect(proof.primitives.strokes).toEqual({
      fullHit: true,
      fullMiss: false,
      halfHit: true,
      halfBounds: false,
      halfMiss: false,
      enlargedHit: true,
      enlargedMiss: false,
      nestedHit: true,
      nestedMiss: false,
      reflectedHit: true,
      singular: false,
      roundCap: true,
      outsideRoundCap: false,
    });
    expect(proof.primitives.providers).toEqual({
      partHit: true,
      partMiss: false,
      zoomHit: true,
      zoomMiss: false,
      designHit: true,
      projectileHit: true,
      projectileMiss: false,
      retainedProjectileHit: true,
      retainedProjectileMiss: false,
    });
    expect(proof.primitives.transparentInk).toBe(0);
    expect(proof.primitives.cacheSize).toBe(256);
    expect(proof.primitives.releasedCache).toBe(0);
    expect(proof.panels).toHaveLength(native ? 8 : 3);
    const shield = proof.panels.find((p: { label: string }) => p.label.startsWith('Shield'));
    const retained = proof.panels.find((p: { label: string }) => p.label.startsWith('Arrival'));
    expect(shield.damage).toBe(0);
    expect(retained.damage).toBe(1);
    expect(proof.panels.at(-1).detached).toBe(false);
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-shape-contact.png` });
    expect(errors).toEqual([]);
  });
