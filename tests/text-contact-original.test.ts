import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import original from './fixtures/text-contact-original.json';

/** Frozen builtin observations, with no production geometry/contact implementation. */
function row(caseName: string, phase = 'baseline', point = 'center', role = 'target') {
  const sample = original.samples.find(
    (s) => s.case === caseName && s.phase === phase && s.point === point && s.role === role,
  );
  if (!sample) throw new Error(`Missing text contact ${caseName}/${phase}/${point}/${role}`);
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
const hit = (caseName: string, phase = 'baseline', point = 'center', role = 'target') =>
  row(caseName, phase, point, role).value('hit');

test('preserved original, derived classifications, emitted probe and loaded byte identities are pinned', () => {
  expect(original.originalSha256).toBe(
    'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153',
  );
  expect(original.probeSha256).toBe(
    '9d5153223e82ff7a4afa068975074ec503fd5aaa7548e3b7c9bc03681256c63a',
  );
  expect(original.emitterSha256).toBe(
    createHash('sha256')
      .update(readFileSync(new URL('../tools/reference/text-contact-probe.py', import.meta.url)))
      .digest('hex'),
  );
  expect(original.runtimeModules.map((m) => m.sha256)).toContain(
    '1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207',
  );
  expect(original.originalAbcPayloadHashes).toEqual([
    '130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c',
    'd849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596',
  ]);
  expect(original.originalTextInventory.map((t) => t.id)).toEqual([
    1659, 1660, 1661, 1662, 1663, 1664, 1665, 1666,
  ]);
  expect(original.wrappers).toHaveLength(10);
  expect(original.addedTags.map((t) => t.code)).toEqual([
    33,
    74,
    33,
    74,
    ...Array(10).fill(39),
    82,
    76,
  ]);
  expect(
    original.derived.map((d) => [d.id, d.source, d.renderer, d.gridFit, d.classification]),
  ).toEqual(
    [61000, 61001].map((id, i) => [
      id,
      1659,
      i,
      2,
      'PROJECT-owned derived DefineText2; only CID differs',
    ]),
  );
});

test('every row retains actual builtin StaticText and fresh/identity Points with Main held at identity', () => {
  expect(original.samples).toHaveLength(322);
  expect(original.fields).toHaveLength(42);
  expect(
    new Set(original.samples.map((s) => [s.case, s.phase, s.point, s.role].join('/'))).size,
  ).toBe(322);
  for (const s of original.samples) {
    const r = row(s.case, s.phase, s.point, s.role);
    expect(r.wordIndices).toHaveLength(42);
    for (const field of original.fields) expect(Number.isFinite(r.value(field))).toBe(true);
    for (const field of ['hit', 'hitAgain', 'visible', 'pointIsInput', 'roundTripIsInput'])
      expect([0, 1]).toContain(r.value(field));
    expect(r.value('hit')).toBe(r.value('hitAgain'));
    expect(r.value('width')).toBe(r.value('widthAgain'));
    expect(r.value('height')).toBe(r.value('heightAgain'));
    expect(r.pointClass).toBe('flash.geom::Point');
    if (s.role === 'target') expect(r.className).toBe('flash.text::StaticText');
    expect(r.value('pointIsInput')).toBe(s.space === 'world' ? 1 : 0);
    expect(r.value('roundTripIsInput')).toBe(0);
    expect(['main.x', 'main.y', 'main.rotation'].map(r.value)).toEqual([0, 0, 0]);
    expect(['main.scaleX', 'main.scaleY'].map(r.value)).toEqual([1, 1]);
  }
});

test('all eight genuine tutorial leaves hit declared interior/min corner and miss the outside control', () => {
  for (let id = 1659; id <= 1666; id++) {
    for (const role of ['target', 'wrapper']) {
      expect(hit(`original-${id}`, 'baseline', 'center', role)).toBe(1);
      expect(hit(`original-${id}`, 'baseline', 'min-min', role)).toBe(1);
      expect(hit(`original-${id}`, 'baseline', 'outside-right', role)).toBe(0);
    }
    const bounds = original.originalTextInventory.find((t) => t.id === id)!.boundsTwips;
    const r = row(`original-${id}`);
    expect(
      ['localBounds.x', 'localBounds.y', 'localBounds.width', 'localBounds.height'].map(r.value),
    ).toEqual([
      bounds[0] / 20,
      bounds[2] / 20,
      (bounds[1] - bounds[0]) / 20,
      (bounds[3] - bounds[2]) / 20,
    ]);
  }
});

test('explicit project normal/advanced controls discriminate empty margin and preserve positive glyph control', () => {
  for (const role of ['target', 'wrapper']) {
    expect(
      ['original-1659', 'derived-normal', 'derived-advanced'].map((c) =>
        hit(c, 'baseline', 'empty-margin', role),
      ),
    ).toEqual([1, 0, 1]);
    expect(
      ['original-1659', 'derived-normal', 'derived-advanced'].map((c) =>
        hit(c, 'baseline', 'glyph-positive', role),
      ),
    ).toEqual([1, 1, 1]);
  }
  for (const s of original.samples.filter((s) => s.case === 'derived-advanced')) {
    const a = row(s.case, s.phase, s.point, s.role),
      b = row('original-1659', s.phase, s.point, s.role);
    expect(a.wordIndices).toEqual(b.wordIndices);
  }
});

test('direct world extrema are inclusive in the measured baseline; points one twip beyond miss', () => {
  for (const role of ['target', 'wrapper']) {
    for (const p of ['min-min', 'max-max', 'left', 'right', 'top', 'bottom'])
      expect(hit('original-1659', 'world-extrema', p, role)).toBe(1);
    for (const p of ['outside-left', 'outside-right', 'outside-top', 'outside-bottom'])
      expect(hit('original-1659', 'world-extrema', p, role)).toBe(0);
  }
  const direct = row('original-1659', 'world-extrema', 'max-max');
  const converted = row('original-1659', 'baseline', 'max-max');
  expect(direct.value('point.x')).toBe(278.84999999999997);
  expect(converted.value('input.x')).toBe(direct.value('point.x'));
  expect(converted.value('point.x')).toBe(278.8);
});

test('rotation hits world AABB corners outside the local rectangle, excluding local-rect/glyph policies', () => {
  for (const phase of ['rotated-parent', 'rotated-leaf', 'nested-transform']) {
    const r = row('original-1659', phase, 'world-near-min');
    const x = r.value('roundTrip.x'),
      y = r.value('roundTrip.y');
    expect(
      x < r.value('localBounds.x') ||
        x > r.value('localBounds.x') + r.value('localBounds.width') ||
        y < r.value('localBounds.y') ||
        y > r.value('localBounds.y') + r.value('localBounds.height'),
    ).toBe(true);
    for (const role of ['target', 'wrapper']) {
      expect(hit('original-1659', phase, 'world-near-min', role)).toBe(1);
      expect(hit('derived-advanced', phase, 'world-near-min', role)).toBe(1);
      expect(hit('derived-normal', phase, 'world-near-min', role)).toBe(0);
      expect(hit('original-1659', phase, 'world-outside-right', role)).toBe(0);
      expect(hit('derived-normal', phase, 'world-center', role)).toBe(1);
    }
  }
  expect(hit('original-1659', 'scaled-parent', 'center')).toBe(1);
  expect(hit('original-1659', 'scaled-parent', 'outside-right')).toBe(0);
});

test('visibility/alpha retain original contact; actual detach misses and reattach restores it', () => {
  for (const role of ['target', 'wrapper']) {
    for (const phase of [
      'target-hidden',
      'target-alpha0',
      'wrapper-hidden',
      'wrapper-alpha0',
      'reattached',
      'wrapper-reattached',
    ])
      expect(hit('original-1659', phase, 'empty-margin', role)).toBe(1);
    for (const phase of ['target-detached', 'wrapper-detached'])
      expect(hit('original-1659', phase, 'empty-margin', role)).toBe(0);
  }
  expect(row('original-1659', 'target-detached', 'empty-margin').value('parentId')).toBe(0);
  expect(row('original-1659', 'target-detached', 'empty-margin').value('width')).toBe(295.4);
  expect(
    row('original-1659', 'wrapper-detached', 'empty-margin', 'wrapper').value('parentId'),
  ).toBe(0);
});

test('StaticText ignores its assigned runtime mask in this cohort; unassigned mask artwork is independently positive', () => {
  expect(hit('original-1659', 'runtime-mask-unassigned', 'empty-margin', 'mask')).toBe(1);
  expect(hit('original-1659', 'runtime-mask-shifted-unassigned', 'empty-margin', 'mask')).toBe(0);
  for (const phase of [
    'runtime-mask-hit',
    'runtime-mask-miss',
    'runtime-mask-hidden',
    'runtime-mask-alpha0',
  ]) {
    expect(row('original-1659', phase, 'empty-margin').value('maskId')).toBe(4);
    expect(hit('original-1659', phase, 'empty-margin')).toBe(1);
    expect(hit('original-1659', phase, 'empty-margin', 'wrapper')).toBe(1);
    expect(hit('original-1659', phase, 'empty-margin', 'mask')).toBe(0);
  }
  expect(row('original-1659', 'runtime-mask-cleared', 'empty-margin').value('maskId')).toBe(0);
});

test('bounded zero scale distinguishes direct advanced StaticText from its wrapper and normal derived text', () => {
  for (const c of ['original-1659', 'derived-advanced']) {
    expect(hit(c, 'zero-scale', 'world-center')).toBe(1);
    expect(hit(c, 'zero-scale', 'world-center', 'wrapper')).toBe(0);
    expect(row(c, 'zero-scale', 'world-center').value('worldBounds.width')).toBe(0);
  }
  expect(hit('derived-normal', 'zero-scale', 'world-center')).toBe(0);
});
