/** Candidate mapping AFTER original words are frozen. No shape algorithm or oracle writes.
 * bun tools/reference/root-query-compare.ts FIXTURE OUTPUT
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  displayMatrixPoint,
  displayMatrixProduct,
  inverseDisplayMatrix,
  type DisplayMatrix,
} from '../../src/game/core/display-transform';
import { displayTwips } from '../../src/game/core/display-values';

const [input, output] = process.argv.slice(2);
if (!output || process.argv.length !== 4) throw new Error('Supply FIXTURE OUTPUT');
assert.notEqual(resolve(input!), resolve(output), 'Never overwrite frozen oracle');
const fixture: {
  fields: string[];
  binaryWords: [number, number][];
  samples: { case: string; phase: string; role: string; wordIndices: number[] }[];
} = JSON.parse(await readFile(input, 'utf8'));
const results = fixture.samples.map((s) => {
  const v = Object.fromEntries(
    s.wordIndices.map((index, i) => {
      const b = Buffer.alloc(8),
        words = fixture.binaryWords[index]!;
      b.writeUInt32BE(words[0]);
      b.writeUInt32BE(words[1], 4);
      return [fixture.fields[i]!, b.readDoubleBE()];
    }),
  );
  const matrix = (prefix: string): DisplayMatrix => ({
    a: v[prefix + '.a']!,
    b: v[prefix + '.b']!,
    c: v[prefix + '.c']!,
    d: v[prefix + '.d']!,
    tx: v[prefix + '.tx']! * 20,
    ty: v[prefix + '.ty']! * 20,
  });
  const point = (prefix: string) => ({ x: v[prefix + '.x']!, y: v[prefix + '.y']! });
  const transform = (m: DisplayMatrix, p: { x: number; y: number }) => {
    const q = displayMatrixPoint(m, { x: displayTwips(p.x), y: displayTwips(p.y) });
    return { x: q.x / 20, y: q.y / 20 };
  };
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Object.is(a.x, b.x) && Object.is(a.y, b.y);
  const root = matrix('mainOwn');
  const physical = displayMatrixProduct(
    root,
    s.role === 'wrapper'
      ? matrix('own')
      : displayMatrixProduct(matrix('wrapperOwn'), matrix('own')),
  );
  const inverse = inverseDisplayMatrix(physical);
  assert(inverse, 'Bounded nonsingular control');
  const checks = [
    ...[
      ['input', 'rawMappedStage'],
      ['stagePoint', 'stageMappedStage'],
      ['rootPoint', 'rootMappedStage'],
    ].map(([from, to]) => ({
      operation: from + ' -> Main -> ' + to,
      actual: point(to!),
      candidate: transform(root, point(from!)),
    })),
    {
      operation: 'receiver.localToGlobal(input)',
      actual: point('stagePoint'),
      candidate: transform(physical, point('input')),
    },
    {
      operation: 'receiver.globalToLocal(stageMappedStage)',
      actual: point('stageMappedLocal'),
      candidate: transform(inverse, point('stageMappedStage')),
    },
  ].map((c) => ({ ...c, matches: same(c.actual, c.candidate) }));
  return { ...s, wordIndices: undefined, checks };
});
const checks = results.flatMap((r) => r.checks);
const report = {
  method:
    'Compare candidate root-relative argument-to-stage mapping with separately measured builtin Points; compose measured own matrices only. No hit algorithm or frozen Number is generated.',
  rows: results.length,
  checks: checks.length,
  mismatches: checks.filter((c) => !c.matches).length,
  limitations:
    'Finite attached player-root controls only; loaded-root route, arbitrary affine/boundary/singular/nonfinite inputs, compiled-source identity and Adobe remain unqualified.',
  results,
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, results: undefined }));
assert.equal(report.mismatches, 0, 'Candidate mapping contradicts frozen original Point oracle');
