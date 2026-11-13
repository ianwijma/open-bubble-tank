import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import original from './fixtures/field-mask-original.json';

/** Observed binary64 values; these tests specify a query contract without a traversal implementation. */
function row(caseName: string, phase = 'baseline', role = 'wrapper') {
  const sample = original.samples.find(
    (s) => s.case === caseName && s.phase === phase && s.role === role,
  );
  if (!sample) throw new Error(`Missing original control ${caseName}/${phase}/${role}`);
  const value = (field: string) => {
    const index = original.fields.indexOf(field);
    if (index < 0) throw new Error(`Unknown field ${field}`);
    const words = original.binaryWords[sample.wordIndices[index]];
    const bytes = new DataView(new ArrayBuffer(8));
    bytes.setUint32(0, words[0]);
    bytes.setUint32(4, words[1]);
    return bytes.getFloat64(0);
  };
  return { ...sample, value };
}
const hit = (caseName: string, phase = 'baseline', role = 'wrapper') =>
  row(caseName, phase, role).value('hit');

test('original mask fixture pins preserved input, executed probe and loaded runtime bytes', () => {
  expect(original.originalSha256).toBe(
    'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153',
  );
  expect(original.probeSha256).toBe(
    '8e9cdee399283d7fa7c534ff7404e1010b7cd196db1902ce602dfbcda669e0e0',
  );
  expect(original.runtimeModules.map((m) => m.sha256)).toContain(
    '1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207',
  );
  expect(original.emitterSha256).toBe(
    createHash('sha256')
      .update(readFileSync(new URL('../tools/reference/field-mask-probe.py', import.meta.url)))
      .digest('hex'),
  );
  expect(original.wrappers).toHaveLength(14);
  expect(original.addedTags.map((t) => t.code)).toEqual([...Array(14).fill(39), 82, 76]);
});

test('all finite rows retain typed Booleans, repeated reads, reference tokens and fresh Points', () => {
  expect(original.samples).toHaveLength(97);
  expect(new Set(original.samples.map((s) => [s.case, s.phase, s.role].join('/'))).size).toBe(97);
  for (const s of original.samples) {
    const sample = row(s.case, s.phase, s.role);
    expect(s.wordIndices).toHaveLength(26);
    for (const key of ['hit', 'hitAgain', 'ownCenterHit', 'visible', 'pointIsInput'])
      expect([0, 1]).toContain(sample.value(key));
    expect(sample.value('hit')).toBe(sample.value('hitAgain'));
    expect(sample.value('width')).toBe(sample.value('widthAgain'));
    expect(sample.value('height')).toBe(sample.value('heightAgain'));
    expect(sample.pointClass).toBe('flash.geom::Point');
    expect(sample.value('pointIsInput')).toBe(0);
    expect(sample.value('point.x')).toBe(s.phase === 'exterior-point' ? 500 : 0);
    expect(sample.value('point.y')).toBe(0);
    expect(sample.value('objectId')).toBeGreaterThan(0);
  }
});

test('overlapping authored masks agree with the changing latch and reject conjunction', () => {
  const measured = ['miss-hit', 'hit-miss', 'hit-hit', 'miss-miss'].map((s) => hit('overlap-' + s));
  expect(measured).toEqual([1, 0, 1, 0]);
  expect(measured).not.toEqual([0, 0, 1, 0]); // All-active-masks intersection prediction.
  for (const pair of ['miss-hit', 'hit-miss', 'hit-hit', 'miss-miss']) {
    expect(hit('overlap-' + pair, 'baseline', 'target')).toBe(1);
    for (const role of ['m1', 'm2'])
      expect(row('overlap-' + pair, 'baseline', role).value('ownCenterHit')).toBe(1);
  }
});

test('ordinary child at the authored end depth is admitted; below it is excluded', () => {
  expect([9, 10, 11].map((depth) => hit('end-' + depth))).toEqual([0, 1, 1]);
  for (const depth of [9, 10, 11]) {
    const children = original.wrappers.find((w) => w.label === 'end-' + depth)!.children;
    expect(children[0].clipDepth).toBe(10);
    expect(children[1].depth).toBe(depth);
    expect(hit('end-' + depth, 'baseline', 'target')).toBe(1);
    expect(row('end-' + depth, 'baseline', 'm1').value('ownCenterHit')).toBe(1);
  }
});

test('nonoverlapping topology corroborates; nested direct queries bypass authored ancestor masks', () => {
  expect(['miss-hit', 'hit-miss', 'hit-hit'].map((s) => hit('nonoverlap-' + s))).toEqual([1, 0, 1]);
  expect(['ancestor-hit', 'ancestor-miss'].map((s) => hit(s))).toEqual([1, 0]);
  expect(['ancestor-hit', 'ancestor-miss'].map((s) => hit(s, 'baseline', 'target'))).toEqual([
    1, 1,
  ]);
  expect(hit('field1551')).toBe(1);
  expect(row('field1551', 'baseline', 'target').value('width')).toBe(101);
  // The original exterior mask has a centre hole. Its miss is explicitly retained.
  expect(hit('field1551', 'baseline', 'm2')).toBe(0);
  expect(hit('field1551', 'exterior-point', 'm2')).toBe(1);
});

test('runtime mask references survive actual reparent and removal, and remain geometric', () => {
  expect(hit('runtime', 'baseline', 'm1')).toBe(1);
  expect(hit('runtime', 'assigned', 'm1')).toBe(0); // Assigned mask itself is excluded.
  for (const phase of [
    'assigned',
    'mask-hidden',
    'mask-alpha0',
    'different-parent',
    'mask-removed',
  ]) {
    expect(hit('runtime', phase)).toBe(1);
    expect(hit('runtime', phase, 'target')).toBe(1);
    expect(row('runtime', phase, 'target').value('maskId')).toBe(4);
  }
  expect(hit('runtime', 'mask-miss', 'target')).toBe(0);
  expect(hit('runtime', 'mask-removed-miss', 'target')).toBe(0);
  expect(row('runtime', 'different-parent', 'm1').value('parentId')).toBe(6);
  expect(row('runtime', 'mask-removed', 'm1').value('parentId')).toBe(0);
  expect(row('runtime', 'mask-removed-miss', 'm1').value('roundTrip.x')).toBe(-1000);
  expect(hit('runtime', 'target-removed')).toBe(0);
  expect(hit('runtime', 'detached-unmasked', 'target')).toBe(0);
  expect(row('runtime', 'detached-unmasked', 'target').value('width')).toBe(101);
  expect(hit('runtime', 'cleared', 'target')).toBe(1);
  expect(row('runtime', 'cleared', 'target').value('maskId')).toBe(0);
});

test('authored hidden mask and alpha-zero mask are distinct; target visibility does not remove shape', () => {
  expect(hit('visibility', 'mask-hidden')).toBe(0);
  expect(hit('visibility', 'mask-hidden', 'm1')).toBe(1);
  for (const phase of ['mask-alpha0', 'target-hidden', 'target-alpha0'])
    expect(hit('visibility', phase)).toBe(1);
  expect(row('visibility', 'mask-hidden', 'm1').value('visible')).toBe(0);
  expect(row('visibility', 'mask-alpha0', 'm1').value('alpha')).toBe(0);
  expect(row('runtime', 'mask-hidden', 'm1').value('visible')).toBe(0);
  expect(hit('runtime', 'mask-hidden')).toBe(1);
});

test('Script width and bounds include authored mask artwork rather than shape-query clipping', () => {
  expect(row('end-9').value('width')).toBe(1474.25);
  expect(row('end-9').value('height')).toBe(847.5);
  expect(row('end-9').value('bounds.width')).toBe(1474.25);
  expect(row('overlap-miss-hit').value('width')).toBe(1847.5);
  expect(row('runtime', 'assigned').value('width')).toBe(847.5);
  expect(row('runtime', 'different-parent').value('width')).toBe(101);
  expect(row('runtime', 'different-parent', 'holder').value('width')).toBe(847.5);
  expect(row('runtime', 'target-removed').value('width')).toBe(0);
  expect(row('field1551').value('width')).toBe(1381.4);
});
