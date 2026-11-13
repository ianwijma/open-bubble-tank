/** Independent preservation and bounded observation verification.
 * node tools/reference/beam-wrapper-verify.mjs ORIGINAL PROBE CAPTURE_DIR
 * Uses the pre-existing project SWF parser, not the emitter's parsing/hashes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  decompressSWF,
  readHeader,
  iterTags,
  parseSymbolClass,
  u16,
} from '../../src/game/assets/swf.mjs';

const [originalPath, probePath, out] = process.argv.slice(2);
if (!out) throw new Error('Supply ORIGINAL PROBE CAPTURE_DIR.');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const equal = (a, b, message) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(message);
};
const parse = async (path) => {
  const raw = await readFile(path);
  const sha256 = sha(raw);
  // The existing parser normalizes the known expanded-CWS carrier in place.
  const { bytes } = await decompressSWF(new Uint8Array(raw));
  const header = readHeader(bytes);
  return {
    sha256,
    bytes: raw.length,
    header,
    headerPayload: sha(bytes.slice(8, header.tagsOffset)),
    tags: [...iterTags(bytes, header.tagsOffset)],
  };
};
const original = await parse(originalPath),
  probe = await parse(probePath);
const abc = (t) => t.code === 72 || t.code === 82;
const other = (t) => !abc(t) && t.code !== 76;
const digestTags = (tags) =>
  tags.map((t) => ({ code: t.code, bytes: t.body.length, sha256: sha(t.body) }));
const originalAbc = digestTags(original.tags.filter(abc)),
  probeAbc = digestTags(probe.tags.filter(abc));
equal(probeAbc.slice(0, originalAbc.length), originalAbc, 'Original ABC changed or reordered.');
if (probeAbc.length !== originalAbc.length + 1) throw new Error('Expected one additional ABC.');
equal(
  digestTags(probe.tags.filter(other)),
  digestTags(original.tags.filter(other)),
  'Original nonbinding payload changed.',
);
equal(original.headerPayload, probe.headerPayload, 'Movie header payload changed.');
// Check the complete original tag sequence, allowing exactly one inserted DoABC
// and the CID0 name change inside SymbolClass, including all tag occurrences.
const binding = (body) => {
  const count = u16(body, 0),
    entries = [];
  let at = 2;
  for (let i = 0; i < count; i++) {
    const cid = u16(body, at);
    at += 2;
    const end = body.indexOf(0, at);
    if (end < 0) throw new Error('Unterminated SymbolClass.');
    entries.push([cid, new TextDecoder().decode(body.slice(at, end))]);
    at = end + 1;
  }
  if (at !== body.length) throw new Error('Trailing SymbolClass bytes.');
  return entries;
};
const originalSymbols = new Map(),
  probeSymbols = new Map();
let pi = 0,
  inserted = 0,
  documentChanges = 0;
for (const source of original.tags) {
  let dest = probe.tags[pi++];
  if (dest.code === 82 && sha(dest.body) === probeAbc.at(-1).sha256) {
    inserted++;
    dest = probe.tags[pi++];
  }
  equal(dest.code, source.code, 'Original tag order changed.');
  if (source.code === 76) {
    parseSymbolClass(source.body, originalSymbols);
    parseSymbolClass(dest.body, probeSymbols);
    const a = binding(source.body),
      b = binding(dest.body);
    equal(
      b.map(([id, name]) => [id, id === 0 ? 'Main' : name]),
      a,
      'Non-document binding changed.',
    );
    documentChanges += b.filter(([id, name]) => id === 0 && name === 'BT3BeamWrapperProbe').length;
  } else equal(sha(dest.body), sha(source.body), 'Original payload changed.');
}
equal(pi, probe.tags.length, 'Unexpected extra tags.');
equal(inserted, 1, 'Expected one insertion.');
equal(documentChanges, 1, 'Expected one CID0 binding change.');
const result = {
  original: { path: originalPath, sha256: original.sha256, bytes: original.bytes },
  probe: { path: probePath, sha256: probe.sha256, bytes: probe.bytes },
  proof: {
    originalTagCount: original.tags.length,
    probeTagCount: probe.tags.length,
    originalAbc,
    addedAbc: probeAbc.at(-1),
    allOriginalPayloadsAndOrderPreserved: true,
    documentBinding: 'BT3BeamWrapperProbe',
    independentParser: 'src/game/assets/swf.mjs',
  },
};

const observed = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
const scenario = JSON.parse(await readFile(resolve(out, 'scenario.json'), 'utf8'));
const lines = observed.trace.filter((line) => line.startsWith('BT3_BEAM'));
const ids = lines.filter((line) => line.startsWith('BT3_BEAM_ID '));
equal(
  ids,
  [
    'BT3_BEAM_ID 11 A10000049',
    'BT3_BEAM_ID 2017',
    'BT3_BEAM_ID _-14::_-CO',
    'BT3_BEAM_ID 0 A10000063',
  ],
  'Blueprint/class identity changed.',
);
equal(
  lines.filter((line) => line.startsWith('BT3_BEAM_TOPOLOGY ')),
  ['BT3_BEAM_TOPOLOGY true true false true 56.8 0.05'],
  'Source sibling topology changed.',
);
const samples = lines
  .filter((line) => line.startsWith('BT3_BEAM_SAMPLE '))
  .map((line) => line.split(' ').slice(1));
const expectedSamples = [
  ['sibling', 0, 1381.4, 1546.5, 1546.5, true, true, true],
  ...[120, 420].map((n) => ['sibling', n, 1381.4, 1510, 1510, true, true, true]),
  ...[426, 600, 900].map((n) => ['sibling', n, 1381.4, 1510, 1510, false, false, true]),
  ['sibling', 1500, 1381.4, 1522.1, 1522.1, false, false, true],
  ['nested', 420, 2195.75, 1510, 1510, true, true, true],
  ['nested', 600, 2195.75, 1510, 1510, true, false, true],
  ['nested', 900, 2195.75, 1510, 1510, false, false, true],
  ['nested', 1500, 2207.85, 1522.1, 1522.1, false, false, true],
].map((row) => row.map(String));
equal(samples, expectedSamples, 'Incomplete or changed resize matrix.');
const edges = lines
  .filter((line) => line.startsWith('BT3_BEAM_EDGE '))
  .map((line) => line.split(' ').slice(1));
equal(
  edges,
  [120, 900].flatMap((length) =>
    [424.9, 425, 425.05, 425.2, 425.25, 425.3, 425.5].map((x) =>
      [length, x, x <= 425.25, x <= 425.25].map(String),
    ),
  ),
  'Edge coordinates/hits changed.',
);
const sweeps = lines
  .filter((line) => line.startsWith('BT3_BEAM_SWEEP '))
  .map((line) => line.split(' ').slice(1));
equal(
  sweeps,
  [
    ...[0, 90, 180, 270, 45].map((angle) => ['bare', 0, 0, angle, 421, 425, 421, 1381.4]),
    ['bare', 400, 0, 0, 25, 29, 25, 1381.4],
    ['bare', -400, 0, 0, 823, 827, 823, 1381.4],
    ['bare', 0, 400, 90, 25, 29, 25, 1381.4],
    ['bare', 5.2, 0, 0, 421, 425, 421, 1381.4],
    ['actor', 0, 0, 0, 445, 449, 445, 1381.4],
    ['far', 0, 0, 0, 972, 976, 972, 1710],
    ['restored', 0, 0, 0, 421, 425, 421, 1381.4],
  ].map((row) => row.map(String)),
  'Original TestForCollision results changed.',
);
equal(lines.at(-1), 'BT3_BEAM_DONE', 'Missing final completion.');
equal(lines.filter((line) => line === 'BT3_BEAM_DONE').length, 1, 'Repeated completion.');
equal(lines.length, 43, 'Missing/unknown/duplicate beam trace rows.');
if (
  observed.errors.length ||
  observed.messages.some((m) => /Error #|recursively acquire mutex|Maximum call stack/.test(m.text))
)
  throw new Error('Runtime/page failure.');
// DOM is retained by REA independently of our MutationObserver collector.
const steps = scenario.normalized_result.steps;
if (steps.some((s) => s.status !== 'completed')) throw new Error('REA action did not complete.');
const dom = steps.at(-1).artifacts.dom.value.text;
const retained = dom.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
if (!retained) throw new Error('Missing REA-retained trace.');
equal(
  retained.split('\n').filter((s) => s.startsWith('BT3_BEAM')),
  lines,
  'Collector differs from independent REA DOM.',
);
if (
  !observed.responses.some(
    (r) => r.url.endsWith('/research.swf') && r.sha256 === probe.sha256 && r.status === 200,
  )
)
  throw new Error('Loaded probe response bytes not established.');
if (observed.modules.modules.length !== 3)
  throw new Error('Expected loader/core/WASM byte inventory.');
for (const module of observed.modules.modules) {
  if (
    !module.installedComparisons.some(
      (file) =>
        file.matchesObserved && file.sha256 === module.sha256 && file.bytes === module.bytes,
    )
  )
    throw new Error('Loaded/installed module mismatch.');
}
if (
  observed.viewerModules?.length !== 1 ||
  !observed.responses.some(
    (r) =>
      r.url === observed.viewerModules[0].url &&
      r.status === 200 &&
      r.sha256 === observed.viewerModules[0].sha256 &&
      r.bytes === observed.viewerModules[0].bytes,
  )
)
  throw new Error('Viewer module loaded/response identity mismatch.');
// Independent finite analytic adapter, for this horizontal empty-candidate phase.
// No production helper import: this intentionally models only radius425/cap850.
let circleSample = 0;
while (circleSample < 850 && Math.abs(5.2 + circleSample) <= 425) circleSample += 6;
result.observation = {
  ids,
  samples,
  edges,
  sweeps,
  radius425PhaseControl: {
    originX: 5.2,
    firstMiss: circleSample,
    lineWidth: circleSample - 5,
    originalLineWidth: 421,
  },
  browser: observed.version,
  loadedModules: observed.modules,
  viewerModules: observed.viewerModules,
  rea: { evidenceId: scenario.evidence_id, completeness: scenario.normalized_result.completeness },
  scope:
    'Finite preserved-original Ruffle method controls. No ordinary-playthrough, Adobe, timing or full-game equality claim.',
};
await writeFile(resolve(out, 'verified-preservation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify({
    preserved: result.proof.allOriginalPayloadsAndOrderPreserved,
    rows: lines.length,
    probeSha256: probe.sha256,
    observation: result.observation.radius425PhaseControl,
  }),
);
