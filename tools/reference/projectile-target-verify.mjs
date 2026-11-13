/** Independent preservation and bounded observation verification.
 * node tools/reference/projectile-target-verify.mjs ORIGINAL PROBE CAPTURE_DIR
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
    documentChanges += b.filter(
      ([id, name]) => id === 0 && name === 'BT3ProjectileTargetProbe',
    ).length;
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
    documentBinding: 'BT3ProjectileTargetProbe',
    independentParser: 'src/game/assets/swf.mjs',
  },
};
try {
  const observed = JSON.parse(await readFile(resolve(out, 'observation-current.json'), 'utf8'));
  const rows = observed.trace
    .filter((line) => line.startsWith('BT3_TARGET '))
    .map((line) => {
      const words = line.split(' ');
      if (words.length !== 12 || !['true', 'false'].includes(words[7]) || words[10] !== 'true')
        throw new Error('Malformed target trace.');
      const numbers = words.slice(2, 7).map(Number);
      if (!numbers.every(Number.isFinite)) throw new Error('Nonfinite pose/motion sample.');
      return {
        label: words[1],
        pose: numbers.slice(0, 3),
        movement: numbers.slice(3),
        enabled: words[7] === 'true',
        queued: Number(words[8]),
        bullets: Number(words[9]),
        targetSame: words[10] === 'true',
        hitTimer: Number(words[11]),
      };
    });
  equal(
    rows.map((r) => r.label),
    [
      'spawn-empty',
      'spawn-empty-run1',
      'spawn-empty-run2',
      'setup-empty',
      'setup-empty-run',
      'target-born',
      'contained-array-missing',
      'detached-stale-array',
      'target-loss-run1',
      'target-loss-run2',
      'fractional-hit',
    ],
    'Incomplete/reordered target sample matrix.',
  );
  equal(
    rows.map((r) => r.enabled),
    [true, false, false, false, false, true, true, true, false, false, true],
    'Source movement gate mismatch.',
  );
  equal(
    rows.map((r) => r.queued),
    [1, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4],
    'Source removal queue mismatch.',
  );
  equal(
    rows.map((r) => r.bullets),
    [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3],
    'Source append count mismatch.',
  );
  equal(
    rows.slice(0, 5).map((r) => r.pose),
    [
      [4, 5, 0],
      [7, 5, 0],
      [7, 5, 0],
      [4, 5, 0],
      [4, 5, 0],
    ],
    'Setup/Spawn/Run distinction mismatch.',
  );
  equal(
    rows.slice(5, 10).map((r) => r.pose),
    [
      [0, 0, 90],
      [0, 0, 90],
      [0, 0, 0],
      [3, 0, 0],
      [3, 0, 0],
    ],
    'Retained target/Run-tail mismatch.',
  );
  equal(
    rows.map((r) => r.hitTimer),
    rows.map(() => 0),
    'Busy sound-gate control changed.',
  );
  equal(
    observed.trace.filter((r) => r.startsWith('BT3_TARGET_BLUEPRINT ')),
    Array(4).fill('BT3_TARGET_BLUEPRINT A10000063'),
    'Basic avatar-default identity mismatch.',
  );
  const point = observed.trace
    .find((r) => r.startsWith('BT3_TARGET_POINT '))
    ?.split(' ')
    .slice(1)
    .map(Number);
  if (!point) throw new Error('Missing transformed hit Point.');
  equal(point.slice(0, 2), [374.9, 325.05], 'Original Point conversion mismatch.');
  const analytic = (360 * Math.atan2(325.05 - 225, 374.9 - 275)) / (2 * Math.PI);
  if (Math.abs(point[2] - analytic) > 1e-12)
    throw new Error('Original angle differs beyond bounded VM math tolerance.');
  if (!observed.trace.includes('BT3_TARGET_DONE')) throw new Error('Missing completion.');
  result.observation = {
    rows,
    hitPoint: point,
    analyticJavaScriptAngle: analytic,
    angleDifference: point[2] - analytic,
    browser: observed.version,
    loadedModules: observed.modules,
    limitation:
      'Controlled original calls and exact Point/phase checks; 1e-12 comparison only for cross-VM trig, not complete execution or timing parity.',
  };
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  result.observation = { status: 'not supplied' };
}
await writeFile(resolve(out, 'verified-preservation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
