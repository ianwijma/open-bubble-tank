/** Record measured source controls; never synthesize expected bounds from native arithmetic.
 * node tools/reference/script-bounds-fixture.mjs ORIGINAL EMISSION CAPTURE OUTPUT.json
 * Follow with beam-wrapper-verify.mjs --script-bounds-audit to qualify the capture.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { decompressSWF } from '../../src/game/assets/swf.mjs';
import { extractSymbols } from '../../src/game/assets/swf-symbols.mjs';
const [source, emissionPath, capture, output] = process.argv.slice(2);
if (!output || process.argv.length !== 6)
  throw new Error('Supply ORIGINAL EMISSION CAPTURE OUTPUT.json.');
if (
  [
    source,
    emissionPath,
    resolve(capture, 'observation.json'),
    resolve(capture, 'scenario.json'),
  ].some((path) => resolve(path) === resolve(output))
)
  throw new Error('Output must differ from every input.');
const emission = JSON.parse(await readFile(emissionPath, 'utf8'));
const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
const raw = await readFile(source);
if (createHash('sha256').update(raw).digest('hex') !== emission.original_sha256)
  throw new Error('Emitter/source identity differs.');
if (observed.errors.length || observed.messages.some((m) => /Error #/.test(m.text)))
  throw new Error('Original runtime/page failure.');
if (
  !observed.responses.some(
    (r) => r.url.endsWith('/research.swf') && r.sha256 === emission.probe_sha256,
  )
)
  throw new Error('Loaded probe identity differs.');
const rows = observed.trace.filter((line) => line.startsWith('BT3_BEAM_BOUNDS'));
if (
  rows.length !== emission.script_bounds_cases.length ||
  rows.some((line, i) => {
    const fields = line.split(' ');
    return (
      fields.length !== 8 ||
      Number(fields[1]) !== i ||
      fields.slice(2).some((s) => !Number.isFinite(Number(s)))
    );
  })
)
  throw new Error('Missing, duplicate, nonfinite or malformed source control.');
const { bytes } = await decompressSWF(new Uint8Array(raw));
const { symbols } = await extractSymbols(bytes, { svg: false });
const leaf = symbols.shapes.find((shape) => shape.id === 1541);
if (!leaf) throw new Error('Missing original mask leaf1541.');
await writeFile(
  output,
  JSON.stringify(
    {
      scope:
        'Preserved original mask1542/shape1541 in project-added empty MovieClips. width/height and getBounds(world) are distinct original observations, not analytic expectations. Matrices use a,b,c,d,tx,ty; translations are integer twips.',
      probeSha256: emission.probe_sha256,
      evidenceId: scenario.evidence_id,
      originalLeafTwips: leaf.bounds,
      cases: emission.script_bounds_cases.map((control, i) => ({ ...control, trace: rows[i] })),
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify({ controls: rows.length, probeSha256: emission.probe_sha256, output }));
