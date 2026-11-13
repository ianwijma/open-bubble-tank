/** Candidate arithmetic comparison AFTER freezing original words. Never an oracle producer.
 * bun tools/reference/actor-point-compare.ts FIXTURE OUTPUT
 * Physical ancestry is assembled from measured own matrices and declared parenting;
 * detached concatenatedMatrix is deliberately not substituted for either Point API.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import {
  displayMatrixProduct,
  displayMatrixPoint,
  inverseDisplayMatrix,
  DISPLAY_IDENTITY,
  type DisplayMatrix,
} from '../../src/game/core/display-transform';
interface Sample {
  phase: string;
  age: number;
  role: string;
  kind: string;
  words: [number, number][];
}
const [input, output] = process.argv.slice(2);
if (!output || process.argv.length !== 4) throw new Error('Supply FIXTURE OUTPUT');
assert.notEqual(resolve(input!), resolve(output), 'Never overwrite original words');
const fixture: { fields: string[]; samples: Sample[] } = JSON.parse(await readFile(input, 'utf8'));
const values = (sample: Sample): Record<string, number> =>
  Object.fromEntries(
    sample.words.map(([hi, lo], i) => {
      const bytes = Buffer.alloc(8);
      bytes.writeUInt32BE(hi);
      bytes.writeUInt32BE(lo, 4);
      return [fixture.fields[i]!, bytes.readDoubleBE()];
    }),
  );
const own = (v: Record<string, number>): DisplayMatrix => ({
  a: v['own.a']!,
  b: v['own.b']!,
  c: v['own.c']!,
  d: v['own.d']!,
  tx: v['own.tx']! * 20,
  ty: v['own.ty']! * 20,
});
const find = (phase: string, age: number, role: string) => {
  const sample = fixture.samples.find((s) => s.phase === phase && s.age === age && s.role === role);
  assert(sample, `Missing measured ${phase}/${age}/${role}`);
  return own(values(sample));
};
const root = find('collapse', 119, 'root-p0'),
  actor = find('collapse', 119, 'actorLayer-p0');
const same = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Object.is(a.x, b.x) && Object.is(a.y, b.y);
const fromPixels = (x: number, y: number) => ({ x: (x * 20) | 0, y: (y * 20) | 0 });
const toPixels = (p: { x: number; y: number }) => ({ x: p.x / 20, y: p.y / 20 });
const results = fixture.samples.map((s) => {
  const v = values(s),
    m = own(v),
    fractional = ['main-fraction', 'detach', 'reparent'].includes(s.phase);
  const world = {
    ...DISPLAY_IDENTITY,
    tx: 5500 + (fractional ? 1 : 0),
    ty: 4500 - (fractional ? 1 : 0),
  };
  let matrix: DisplayMatrix;
  if (s.phase === 'reparent') matrix = displayMatrixProduct(displayMatrixProduct(root, actor), m);
  else if (s.phase === 'detach')
    matrix = s.role.startsWith('actorLayer') ? displayMatrixProduct(root, m) : m;
  else if (s.role.startsWith('actorLayer'))
    matrix = displayMatrixProduct(displayMatrixProduct(world, find(s.phase, s.age, 'root-p0')), m);
  else matrix = displayMatrixProduct(world, m);
  const stage = { x: v['stage.x']!, y: v['stage.y']! },
    actual = { x: v['local.x']!, y: v['local.y']! };
  const inverse = inverseDisplayMatrix(matrix);
  assert(inverse, 'Finite qualified inverse');
  const candidate = toPixels(displayMatrixPoint(inverse, fromPixels(stage.x, stage.y)));
  const localInput = { x: v['input.x']!, y: v['input.y']! };
  const forward =
    s.kind === 'stage'
      ? null
      : toPixels(
          displayMatrixPoint(
            s.kind === 'transfer' ? world : matrix,
            fromPixels(localInput.x, localInput.y),
          ),
        );
  return {
    ...s,
    words: undefined,
    input: localInput,
    stage,
    actual,
    candidate,
    matrix,
    forward,
    inverseMatches: same(candidate, actual),
    forwardMatches: forward === null ? null : same(forward, stage),
    roundtripIdentity: s.kind === 'roundtrip' ? same(actual, localInput) : null,
  };
});
const report = {
  method:
    'Candidate displayMatrixProduct/inverseDisplayMatrix/displayMatrixPoint; every builtin Point boundary truncates pixel*20 input and returns rounded float32 twips/20. Original runtime words were frozen first; comparison never generates fixture values.',
  inverseChecks: results.length,
  inverseMismatches: results.filter((r) => !r.inverseMatches).length,
  forwardChecks: results.filter((r) => r.forwardMatches !== null).length,
  forwardMismatches: results.filter((r) => r.forwardMatches === false).length,
  roundtripIdentityCounterexamples: results.filter((r) => r.roundtripIdentity === false).length,
  limitations:
    'Finite declared physical chains only. No arbitrary affine/singular/overflow/NaN/infinite/Adobe/compiled-Ruffle-source equivalence claim.',
  results,
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, results: undefined }));
assert.equal(report.inverseMismatches, 0);
assert.equal(report.forwardMismatches, 0);
