import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
test(`mock contact follows geometric shapes and attached protection rather than painted alpha`, async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('shape-contact');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-shape-contact'))!);
  writeFileSync(
    testInfo.outputPath('native-shape-geometry.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  expect(proof.nativeGeometry).toBeNull();
  expect(proof.rootGeometry).toBeNull();
  expect(proof.textGeometry).toBeNull();
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
  expect(proof.primitives.retainedStrokes).toEqual(proof.primitives.strokes);
  expect(proof.primitives.retainedTransparentFill).toBe(true);
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
  expect(proof.membership).toHaveLength(1);
  for (const control of proof.membership) {
    expect(control.beforeViews).toBeGreaterThan(0);
    expect(control.afterViews).toBe(0);
    expect([control.before, control.after, control.restored, control.logicalStateRetained]).toEqual(
      [true, false, true, true],
    );
  }
  expect(proof.primitives.cacheSize).toBe(256);
  expect(proof.primitives.releasedCache).toBe(0);
  expect(proof.panels).toHaveLength(3);
  const shield = proof.panels.find((p: { label: string }) => p.label.startsWith('Shield'));
  const retained = proof.panels.find((p: { label: string }) => p.label.startsWith('Arrival'));
  expect(shield.damage).toBe(0);
  expect(retained.damage).toBe(1);
  expect(proof.panels.at(-1).detached).toBe(false);
  await page.locator('#stage').screenshot({ path: `test-results/mock-shape-contact.png` });
  expect(errors).toEqual([]);
});
