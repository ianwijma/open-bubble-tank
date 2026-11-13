/** Preserve original binary getter words, independently of native setter arithmetic.
 * node tools/reference/under-avatar-fixture.mjs ORIGINAL PROBE EMISSION CAPTURE OUTPUT
 * The baseline verifier writes only inside the caller-owned CAPTURE directory.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decompressSWF } from '../../src/game/assets/swf.mjs';
import { extractSymbols } from '../../src/game/assets/swf-symbols.mjs';

const [source, probe, emissionPath, capture, output] = process.argv.slice(2);
if (!output || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE OUTPUT.');
const inputPaths = [
  source,
  probe,
  emissionPath,
  ...['observation.json', 'scenario.json', 'verified-preservation.json'].map((name) =>
    resolve(capture, name),
  ),
];
if (inputPaths.some((path) => resolve(path) === resolve(output)))
  throw new Error('Output must differ from every input and preservation result.');

const verification = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('./beam-wrapper-verify.mjs', import.meta.url)),
    source,
    probe,
    capture,
    '--geometry-audit',
  ],
  { encoding: 'utf8' },
);
if (verification.status !== 0)
  throw new Error(`Original preservation/baseline verification failed: ${verification.stderr}`);
const emission = JSON.parse(await readFile(emissionPath, 'utf8'));
const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = await readFile(source),
  probeBytes = await readFile(probe);
if (sha(raw) !== emission.original_sha256 || sha(probeBytes) !== emission.probe_sha256)
  throw new Error('Source/probe/emission identity differs.');

const expected = emission.under_avatar_cases.flatMap((control, index) =>
  ['before', 'width', 'height', ...(control.repeat ? ['repeat-width', 'repeat-height'] : [])].map(
    (phase) => ({ index, phase }),
  ),
);
const lines = observed.trace.filter((line) => line.startsWith('BT3_UNDER'));
const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value.text;
const retained = dom.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
if (
  !retained ||
  JSON.stringify(retained.split('\n').filter((line) => line.startsWith('BT3_UNDER'))) !==
    JSON.stringify(lines)
)
  throw new Error('Binary/decimal collector differs from independently retained REA DOM.');
if (lines.length !== expected.length * 2) throw new Error('Missing/extra under-avatar trace rows.');
const phases = expected.map(({ index, phase }, ordinal) => {
  const text = lines[ordinal * 2],
    binary = lines[ordinal * 2 + 1];
  const prefix = ` ${index} ${phase} `;
  if (!text.startsWith(`BT3_UNDER_SIZE${prefix}`) || !binary.startsWith(`BT3_UNDER_BITS${prefix}`))
    throw new Error('Changed, duplicate or reordered original control.');
  const words = binary.split(' ').slice(3);
  if (
    words.length !== 22 ||
    words.some((word) => !/^(0|[1-9]\d*)$/.test(word) || Number(word) > 0xffffffff)
  )
    throw new Error('Invalid original unsigned binary word.');
  const pairs = Array.from({ length: 11 }, (_, i) => words.slice(i * 2, i * 2 + 2).map(Number));
  for (const [high, low] of pairs) {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32BE(high, 0);
    bytes.writeUInt32BE(low, 4);
    if (!Number.isFinite(bytes.readDoubleBE())) throw new Error('Nonfinite original control.');
  }
  return { index, phase, words: pairs, decimalTrace: text, binaryTrace: binary };
});
const { bytes } = await decompressSWF(new Uint8Array(raw));
const { symbols } = await extractSymbols(bytes, { svg: false });
const leaf = symbols.shapes.find((shape) => shape.id === 1543);
if (!leaf) throw new Error('Missing original under-avatar shape1543.');
const fixture = {
  scope:
    'Original1544/1543 positive axis-aligned width-then-height controls. Original ByteArray.writeDouble/readUnsignedInt preserves f64 getters and effective matrix words, including signed zero. Decimal text is retained but is not a binary numeric oracle. No rotated/reflected/invalid/empty sizing or Adobe/full-game equality claim.',
  originalSha256: sha(raw),
  probeSha256: sha(probeBytes),
  evidenceId: scenario.evidence_id,
  runtimeModules: observed.modules.modules
    .map(({ sha256, bytes }) => ({ sha256, bytes }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256)),
  originalLeafTwips: leaf.bounds,
  fields: ['requested', 'width', 'height', 'scaleX', 'scaleY', 'a', 'b', 'c', 'd', 'tx', 'ty'],
  cases: emission.under_avatar_cases,
  phases,
};
await writeFile(output, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  JSON.stringify({
    controls: phases.length,
    probeSha256: fixture.probeSha256,
    evidenceId: fixture.evidenceId,
    output,
  }),
);
