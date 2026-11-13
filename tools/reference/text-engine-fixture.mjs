/** Generate only from caller-owned original captures, never candidate transforms.
 * node tools/reference/text-engine-fixture.mjs ORIGINAL PROBE EMISSION CAPTURE OUTPUT
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureEvidence } from './text-engine-evidence.mjs';
const [original, probe, emission, capture, output] = process.argv.slice(2);
if (!output || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE OUTPUT');
if (
  [
    original,
    probe,
    emission,
    ...[
      'observation.json',
      'scenario.json',
      'trace.jsonl',
      'verified-text-engine-preservation.json',
    ].map((p) => resolve(capture, p)),
  ].some((p) => resolve(p) === resolve(output))
)
  throw new Error('Output must differ from input/proof paths');
const { fixture, proof } = await captureEvidence(original, probe, emission, capture);
fixture.evidenceId = proof.evidenceId;
await writeFile(output, JSON.stringify(fixture, null, 2) + '\n');
console.log(
  JSON.stringify({
    output,
    samples: proof.binarySamples,
    values: proof.binaryValues,
    evidenceId: proof.evidenceId,
  }),
);
