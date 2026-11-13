/** Verify only a caller-owned CAPTURE; freeze is explicit and never ordinary verification. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureEvidence } from './under-avatar-paint-evidence.mjs';
const [original, probe, emission, capture, output] = process.argv.slice(2);
if (!capture || process.argv.length > 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE [NEW_FIXTURE]');
const { fixture, proof } = await captureEvidence(original, probe, emission, capture);
if (output)
  await writeFile(
    output,
    JSON.stringify({ evidenceId: proof.evidenceId, ...fixture }, null, 2) + '\n',
    { flag: 'wx' },
  );
else {
  const { evidenceId, ...frozen } = JSON.parse(
    await readFile(
      new URL('../../tests/fixtures/under-avatar-paint-original.json', import.meta.url),
      'utf8',
    ),
  );
  assert(evidenceId);
  assert.deepEqual(fixture, frozen, 'Changed frozen original paint/source/runtime');
}
await writeFile(
  resolve(capture, 'verified-under-avatar-paint.json'),
  JSON.stringify({
    evidenceId: proof.evidenceId,
    samples: proof.samples,
    pixels: proof.pixels,
    reaCompleteness: proof.reaCompleteness,
  }) + '\n',
);
console.log(
  JSON.stringify({
    evidenceId: proof.evidenceId,
    samples: proof.samples,
    pixels: proof.pixels,
    reaCompleteness: proof.reaCompleteness,
  }),
);
