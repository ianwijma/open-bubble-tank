/** Verify measured binary words against the frozen original controls.
 * Writes derived results ONLY in the caller-owned CAPTURE directory.
 * node tools/reference/under-avatar-verify.mjs ORIGINAL PROBE EMISSION CAPTURE
 */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [source, probe, emission, capture] = process.argv.slice(2);
if (!capture || process.argv.length !== 6)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE.');
const candidatePath = resolve(capture, 'verified-under-avatar-candidate.json');
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('./under-avatar-fixture.mjs', import.meta.url)),
    source,
    probe,
    emission,
    capture,
    candidatePath,
  ],
  { encoding: 'utf8' },
);
if (result.status !== 0) throw new Error(`Source capture verification failed: ${result.stderr}`);
const candidate = JSON.parse(await readFile(candidatePath, 'utf8'));
const frozen = JSON.parse(
  await readFile(
    new URL('../../tests/fixtures/under-avatar-original.json', import.meta.url),
    'utf8',
  ),
);
for (const key of [
  'originalSha256',
  'probeSha256',
  'runtimeModules',
  'originalLeafTwips',
  'fields',
  'cases',
])
  assert.deepEqual(candidate[key], frozen[key], `Changed original ${key}`);
const measured = (fixture) =>
  fixture.phases.map(({ index, phase, words }) => ({ index, phase, words }));
assert.deepEqual(measured(candidate), measured(frozen), 'Changed original binary getter control');
const verified = {
  evidenceId: candidate.evidenceId,
  originalControls: candidate.phases.length,
  retainedBaselineControls: 70,
  originalPayloadsAndOrderPreserved: true,
  binaryGetterWordsMatch: true,
  probeSha256: candidate.probeSha256,
  runtimeModules: candidate.runtimeModules,
  scope: candidate.scope,
};
await writeFile(
  resolve(capture, 'verified-under-avatar.json'),
  `${JSON.stringify(verified, null, 2)}\n`,
);
console.log(JSON.stringify(verified));
