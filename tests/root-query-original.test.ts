import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import original from './fixtures/root-query-original.json';

function row(caseName: string, phase = 'centre', role = 'target') {
  const s = original.samples.find(
    (s) => s.case === caseName && s.phase === phase && s.role === role,
  );
  if (!s) throw new Error(`Missing original ${caseName}/${phase}/${role}`);
  const value = (field: string) => {
    const i = original.fields.indexOf(field);
    if (i < 0) throw new Error('Unknown original field ' + field);
    const words = original.binaryWords[s.wordIndices[i]];
    const b = new DataView(new ArrayBuffer(8));
    b.setUint32(0, words[0]);
    b.setUint32(4, words[1]);
    return b.getFloat64(0);
  };
  return { ...s, value };
}
test('original root-query fixture pins preserved input, added geometric wrapper and emitter', () => {
  expect(original.originalSha256).toBe(
    'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153',
  );
  expect(original.probeSha256).toBe(
    '7b116288e45b06c19cf3564cbdd7137fcadcf5fa66da2d2dff6517423a0b286d',
  );
  expect(original.emitterSha256).toBe(
    createHash('sha256')
      .update(readFileSync(new URL('../tools/reference/root-query-probe.py', import.meta.url)))
      .digest('hex'),
  );
  expect(original.wrappers).toEqual([
    {
      label: 'geometric',
      id: 60000,
      class: 'RootQuery60000',
      children: [{ symbol: 1544, depth: 1, name: 'target', x: 0, clipDepth: null }],
    },
  ]);
  expect(original.addedTags.map((t) => t.code)).toEqual([39, 82, 76]);
  expect(original.runtimeModules.map((m) => m.sha256)).toContain(
    '1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207',
  );
});
test('all attached original receivers identify actual Main player-root and null loader', () => {
  expect(original.samples).toHaveLength(36);
  expect(original.fields).toHaveLength(72);
  for (const s of original.samples) {
    const r = row(s.case, s.phase, s.role);
    expect(s.wordIndices).toHaveLength(72);
    for (const key of [
      'rootId',
      'mainRootId',
      'rootIsMain',
      'parentIsExpected',
      'stageIsMainStage',
      'loaderInfoIsMain',
      'loaderInfoContentIsMain',
      'rootLoaderInfoContentIsMain',
    ])
      expect(r.value(key)).toBe(1);
    for (const key of ['loaderId', 'rootLoaderId', 'rootIsStage']) expect(r.value(key)).toBe(0);
    for (const key of ['loaderInfoId', 'mainLoaderInfoId', 'rootLoaderInfoId'])
      expect(r.value(key)).toBe(5);
    expect(r.value('stageId')).toBe(4);
    expect(r.value('mainParentId')).toBe(4);
    expect(r.value('parentId')).toBe(s.role === 'wrapper' ? 1 : 2);
    expect(r.value('stageHit')).toBe(r.value('stageHitAgain'));
    for (const key of ['rawHit', 'stageHit', 'rootHit']) expect([0, 1]).toContain(r.value(key));
    expect(r.pointClass).toBe('flash.geom::Point');
  }
});
test('1000px Main translation distinguishes root-relative public arguments from actual stage Points', () => {
  for (const role of ['wrapper', 'target']) {
    const r = row('main1000', 'centre', role);
    expect([r.value('input.x'), r.value('input.y')]).toEqual([0, 0]);
    expect([r.value('stagePoint.x'), r.value('stagePoint.y')]).toEqual([1000, 0]);
    expect([r.value('rootPoint.x'), r.value('rootPoint.y')]).toEqual([0, 0]);
    expect([r.value('rawHit'), r.value('stageHit'), r.value('rootHit')]).toEqual([1, 0, 1]);
    expect(r.value('stageMappedStage.x')).toBe(2000);
    expect(r.value('stageMappedLocal.x')).toBe(1000);
    expect(row('identity', 'centre', role).value('stageHit')).toBe(1);
    expect(row('identity', 'far', role).value('rawHit')).toBe(0);
  }
});
test('fractional Main setters retain signed twips independently from root argument conversion', () => {
  const r = row('main-fraction');
  expect([r.value('main.x'), r.value('main.y')]).toEqual([0.05, -0.05]);
  expect([r.value('stagePoint.x'), r.value('stagePoint.y')]).toEqual([0.05, -0.05]);
  expect([r.value('rootPoint.x'), r.value('rootPoint.y')]).toEqual([0, 0]);
  expect([r.value('stageMappedStage.x'), r.value('stageMappedStage.y')]).toEqual([0.1, -0.1]);
  expect([r.value('rawHit'), r.value('stageHit'), r.value('rootHit')]).toEqual([1, 1, 1]);
});
test('affine and nested controls distinguish receiver-local input, root argument and stage Point', () => {
  for (const role of ['wrapper', 'target']) {
    const main = row('main-affine', 'centre', role),
      nested = row('nested-affine', 'centre', role);
    expect([main.value('rawHit'), main.value('stageHit'), main.value('rootHit')]).toEqual([
      1, 0, 1,
    ]);
    expect([nested.value('rawHit'), nested.value('stageHit'), nested.value('rootHit')]).toEqual([
      0, 0, 1,
    ]);
    expect([nested.value('rootPoint.x'), nested.value('rootPoint.y')]).toEqual([37.05, -21]);
    expect([nested.value('stagePoint.x'), nested.value('stagePoint.y')]).toEqual([1047.95, -190.5]);
    expect(nested.value('main.rotation')).toBe(30);
    for (const phase of [
      'identity',
      'main1000',
      'main-offset',
      'main-fraction',
      'main-affine',
      'nested-affine',
    ])
      expect(row(phase, 'far', role).value('rootHit')).toBe(0);
  }
});
