/** Frozen words reject consistently forged observer/DOM/raw controls.
 * Writes derived outputs ONLY into caller-owned CAPTURE.
 * node tools/reference/world-layer-verify.mjs ORIGINAL PROBE EMISSION CAPTURE
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { captureEvidence } from './world-layer-evidence.mjs';
const [original, probe, emission, capture] = process.argv.slice(2);
if (!capture || process.argv.length !== 6)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE');
const { fixture, proof } = await captureEvidence(original, probe, emission, capture);
const frozen = JSON.parse(
  await readFile(
    new URL('../../tests/fixtures/world-layer-original.json', import.meta.url),
    'utf8',
  ),
);
const { evidenceId, ...expected } = frozen;
assert(evidenceId, 'Missing original evidence identity');
assert.deepEqual(
  fixture,
  expected,
  'Changed frozen original words/ancestry/cohort/probe/source/runtime',
);
await writeFile(
  resolve(capture, 'verified-world-layer.json'),
  JSON.stringify({ ...proof, frozenBinaryWordsMatch: true }, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    samples: proof.binarySamples,
    values: proof.binaryValues,
    evidenceId: proof.evidenceId,
    reaCompleteness: proof.reaCompleteness,
  }),
);
