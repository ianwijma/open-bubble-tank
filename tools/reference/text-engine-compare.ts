/** Candidate-only comparison AFTER builtin binary words were frozen.
 * No original/capture/fixture writes; Script bounds never supply candidate bounds.
 * bun tools/reference/text-engine-compare.ts FIXTURE OUTPUT
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  DISPLAY_IDENTITY,
  displayMatrixProduct,
  displayMatrixRectangle,
  inverseDisplayMatrix,
  type DisplayMatrix,
  type DisplayRectangle,
} from '../../src/game/core/display-transform';
import { displayTwips } from '../../src/game/core/display-values';
import {
  advancedStaticTextStageContains,
  staticTextEngineBounds,
} from '../../src/game/core/static-text-geometry';

export interface TextEngineFixture {
  fields: string[];
  binaryWords: number[][];
  originalTextInventory: { id: number; boundsTwips: number[] }[];
  samples: {
    case: string;
    phase: string;
    role: string;
    point: string;
    space: string;
    wordIndices: number[];
  }[];
}
export function observedValues(
  fixture: TextEngineFixture,
  sample: TextEngineFixture['samples'][number],
) {
  return Object.fromEntries(
    sample.wordIndices.map((index, i) => {
      const words = fixture.binaryWords[index]!;
      const b = Buffer.alloc(8);
      b.writeUInt32BE(words[0]!);
      b.writeUInt32BE(words[1]!, 4);
      return [fixture.fields[i]!, b.readDoubleBE()];
    }),
  );
}
export function observedMatrix(values: Record<string, number>, prefix: string): DisplayMatrix {
  return Object.fromEntries(
    ['a', 'b', 'c', 'd', 'tx', 'ty'].map((key) => [
      key,
      values[prefix + '.' + key]! * (key === 'tx' || key === 'ty' ? 20 : 1),
    ]),
  ) as unknown as DisplayMatrix;
}
const contains = (b: DisplayRectangle, p: { x: number; y: number }) =>
  p.x >= b.xMin && p.x <= b.xMax && p.y >= b.yMin && p.y <= b.yMax;
const same = (a: DisplayMatrix, b: DisplayMatrix) =>
  (['a', 'b', 'c', 'd', 'tx', 'ty'] as const).every((key) => Object.is(a[key], b[key]));
export function compareTextEngine(fixture: TextEngineFixture) {
  const rows = fixture.samples.map((sample) => {
    const v = observedValues(fixture, sample);
    const own = observedMatrix(v, 'targetOwn'),
      parent = observedMatrix(v, 'wrapperOwn');
    const concatenated = observedMatrix(v, 'targetConcatenated');
    const attached = !['target-detached', 'wrapper-detached'].includes(sample.phase);
    // Actual Main getters are fixed to identity in this cohort. Include that
    // multiplication: source walks every parent; even signed zero can differ.
    const composed = displayMatrixProduct(DISPLAY_IDENTITY, displayMatrixProduct(parent, own));
    const matrixMatches = !attached || same(composed, concatenated);
    const wrapperComposed = displayMatrixProduct(DISPLAY_IDENTITY, parent);
    const wrapperMatrixMatches =
      sample.phase === 'wrapper-detached' ||
      same(wrapperComposed, observedMatrix(v, 'wrapperConcatenated'));
    if (sample.role === 'mask' || sample.case === 'derived-normal')
      return {
        ...sample,
        wordIndices: undefined,
        matrixMatches,
        wrapperMatrixMatches,
        contact: null,
      };
    const id = sample.case === 'derived-advanced' ? 1659 : Number(sample.case.split('-')[1]);
    const twips = fixture.originalTextInventory.find((t) => t.id === id)!.boundsTwips;
    const declared = { xMin: twips[0]!, xMax: twips[1]!, yMin: twips[2]!, yMax: twips[3]! };
    // Keep the public Point write distinct from the bounds transformation.
    const point = { x: displayTwips(v['point.x']!), y: displayTwips(v['point.y']!) };
    const bounds = staticTextEngineBounds(declared, own, [parent, DISPLAY_IDENTITY]);
    const leaf = advancedStaticTextStageContains(declared, own, [parent, DISPLAY_IDENTITY], point);
    // Explicit bounded wrapper dispatch: no assigned wrapper mask/other children
    // exist here. The measured MovieClip checks its inverse before this child.
    const wrapperInverse = inverseDisplayMatrix(wrapperComposed);
    const candidate = Number(
      attached && leaf && (sample.role !== 'wrapper' || wrapperInverse !== null),
    );
    const actual = v.hit!;
    const exactCorners = [
      [declared.xMin, declared.yMin],
      [declared.xMin, declared.yMax],
      [declared.xMax, declared.yMin],
      [declared.xMax, declared.yMax],
    ].map(([x, y]) => ({
      x: composed.a * x! + composed.c * y! + composed.tx,
      y: composed.b * x! + composed.d * y! + composed.ty,
    }));
    const ideal = {
      xMin: Math.min(...exactCorners.map((p) => p.x)),
      xMax: Math.max(...exactCorners.map((p) => p.x)),
      yMin: Math.min(...exactCorners.map((p) => p.y)),
      yMax: Math.max(...exactCorners.map((p) => p.y)),
    };
    const gate = (hit: boolean) =>
      Number(attached && hit && (sample.role !== 'wrapper' || wrapperInverse !== null));
    const perLevel = displayMatrixRectangle(
      DISPLAY_IDENTITY,
      displayMatrixRectangle(parent, displayMatrixRectangle(own, declared)),
    );
    return {
      ...sample,
      wordIndices: undefined,
      matrixMatches,
      wrapperMatrixMatches,
      contact: {
        actual,
        candidate,
        matches: candidate === actual,
        point,
        bounds,
        idealNumberCandidate: gate(contains(ideal, point)),
        perAncestorAabbCandidate: gate(contains(perLevel, point)),
        inverseBeforeLeafCandidate: gate(leaf && inverseDisplayMatrix(composed) !== null),
      },
    };
  });
  const contacts = rows.flatMap((row) => (row.contact ? [row.contact] : []));
  return {
    method:
      'Declared original twips plus measured own/parent matrices; source-derived Float32 composition, rounded corners and inclusive bounds. Separately quantized query Point. No Script bounds input or generated oracle.',
    rows: rows.length,
    advancedContacts: contacts.length,
    matrixChecks:
      rows.length * 2 -
      rows.filter((r) => ['target-detached', 'wrapper-detached'].includes(r.phase)).length -
      rows.filter((r) => r.phase === 'wrapper-detached').length,
    skippedDetachedMatrixChecks:
      rows.filter((r) => ['target-detached', 'wrapper-detached'].includes(r.phase)).length +
      rows.filter((r) => r.phase === 'wrapper-detached').length,
    matrixMismatches: rows.filter((r) => !r.matrixMatches || !r.wrapperMatrixMatches).length,
    contactMismatches: contacts.filter((c) => !c.matches).length,
    rejectedAlternatives: {
      idealNumberBounds: contacts.filter((c) => c.idealNumberCandidate !== c.actual).length,
      perAncestorAabb: contacts.filter((c) => c.perAncestorAabbCandidate !== c.actual).length,
      inverseBeforeLeaf: contacts.filter((c) => c.inverseBeforeLeafCandidate !== c.actual).length,
    },
    limitations:
      'Finite original1659–1666 and project advanced copy, Main0, 2D transforms without scrollRect. Normal glyphs/mask options/authored text masks, arbitrary singular/nonfinite/overflow, loaded-root, compiled revision and Adobe remain unqualified.',
    results: rows,
  };
}
if (import.meta.main) {
  const [input, output] = process.argv.slice(2);
  if (!output || process.argv.length !== 4) throw new Error('Supply FIXTURE OUTPUT');
  assert.notEqual(resolve(input!), resolve(output), 'Never overwrite frozen oracle');
  const report = compareTextEngine(JSON.parse(await readFile(input!, 'utf8')));
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, results: undefined }));
  assert.equal(report.matrixMismatches, 0, 'Matrix candidate contradicts genuine getters');
  assert.equal(report.contactMismatches, 0, 'Engine candidate contradicts genuine builtin hit');
}
