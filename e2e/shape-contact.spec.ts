import { expect, test } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import original from '../tests/fixtures/field-mask-original.json' with { type: 'json' };
import rootOriginal from '../tests/fixtures/root-query-original.json' with { type: 'json' };
function originalValue(row: (typeof original.samples)[number], field: string) {
  const words = original.binaryWords[row.wordIndices[original.fields.indexOf(field)]],
    bytes = new DataView(new ArrayBuffer(8));
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} contact follows geometric shapes and attached protection rather than painted alpha`, async ({
    page,
  }, testInfo) => {
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
    writeFileSync(
      testInfo.outputPath('native-shape-geometry.json'),
      JSON.stringify(proof, null, 2) + '\n',
    );
    if (native) {
      const authored = new Set(
          original.wrappers
            .filter((w) => !['runtime', 'visibility'].includes(w.label))
            .map((w) => w.label),
        ),
        expectedRows = original.samples.filter(
          (s) =>
            (authored.has(s.case) && s.phase === 'baseline' && s.role === 'wrapper') ||
            (s.case === 'visibility' && s.role === 'wrapper') ||
            (s.case === 'runtime' && ['wrapper', 'target', 'm1', 'holder'].includes(s.role)),
        ),
        key = (row: { case: string; phase: string; role: string }) =>
          `${row.case}/${row.phase}/${row.role}`;
      expect(proof.nativeGeometry).toHaveLength(51);
      expect(proof.nativeGeometry.map(key).sort()).toEqual(expectedRows.map(key).sort());
      for (const row of proof.nativeGeometry) {
        const expected = original.samples.find(
          (s) => s.case === row.case && s.phase === row.phase && s.role === row.role,
        )!;
        expect({
          key: `${row.case}/${row.phase}/${row.role}`,
          hit: Number(row.hit),
          width: row.width,
          height: row.height,
        }).toEqual({
          key: `${expected.case}/${expected.phase}/${expected.role}`,
          hit: originalValue(expected, 'hit'),
          width: originalValue(expected, 'width'),
          height: originalValue(expected, 'height'),
        });
      }
      expect(proof.rootGeometry).toHaveLength(36);
      expect(proof.rootGeometry.map(key).sort()).toEqual(rootOriginal.samples.map(key).sort());
      for (const row of proof.rootGeometry) {
        const expected = rootOriginal.samples.find((s) => key(s) === key(row))!,
          value = (field: string) => {
            const words =
                rootOriginal.binaryWords[expected.wordIndices[rootOriginal.fields.indexOf(field)]],
              view = new DataView(new ArrayBuffer(8));
            view.setUint32(0, words[0]);
            view.setUint32(4, words[1]);
            return view.getFloat64(0);
          };
        expect([
          Number(row.rawHit),
          Number(row.stageHit),
          Number(row.rootHit),
          row.width,
          row.height,
        ]).toEqual(['rawHit', 'stageHit', 'rootHit', 'width', 'height'].map(value));
      }
    } else {
      expect(proof.nativeGeometry).toBeNull();
      expect(proof.rootGeometry).toBeNull();
    }
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
