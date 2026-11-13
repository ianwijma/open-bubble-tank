/** Independent preservation and bounded observation verification.
 * node tools/reference/carrier-clock-verify.mjs ORIGINAL PROBE CAPTURE_DIR
 * Uses the pre-existing project SWF parser, not the emitter's parsing/hashes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decompressSWF,
  readHeader,
  iterTags,
  parseSymbolClass,
  u16,
} from '../../src/game/assets/swf.mjs';
import { parseSpriteTag } from '../../src/game/assets/swf-symbols.mjs';

const [originalPath, probePath, out] = process.argv.slice(2);
if (!out) throw new Error('Supply ORIGINAL PROBE CAPTURE_DIR.');
const captureRoot = fileURLToPath(new URL('../../reference-captures/', import.meta.url));
if (!resolve(out).startsWith(resolve(captureRoot) + sep))
  throw new Error('Verification output must stay in this checkout’s reference-captures directory.');
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
    documentChanges += b.filter(([id, name]) => id === 0 && name === 'BT3CarrierClockProbe').length;
  } else equal(sha(dest.body), sha(source.body), 'Original payload changed.');
}
equal(pi, probe.tags.length, 'Unexpected extra tags.');
equal(inserted, 1, 'Expected one insertion.');
equal(documentChanges, 1, 'Expected one CID0 binding change.');
const roots = ['_-YE', '_-5z'];
const rootInventory = roots.map((name) => {
  const ids = [...originalSymbols].filter(([, n]) => n === name).map(([id]) => id);
  return {
    name,
    ids,
    sprites: ids.map((id) => {
      const t = original.tags.find((t) => t.code === 39 && u16(t.body, 0) === id);
      return t
        ? {
            id,
            frames: u16(t.body, 2),
            tags: digestTags([...iterTags(t.body, 4)]),
            placements: parseSpriteTag(t.body).placements.map((p) => {
              const child = original.tags.find((t) => t.code === 39 && u16(t.body, 0) === p.charId);
              return {
                ...p,
                childClass: originalSymbols.get(p.charId) ?? null,
                childFrames: child ? u16(child.body, 2) : null,
              };
            }),
          }
        : null;
    }),
  };
});
const sourceHashes = JSON.parse(await readFile(resolve(out, 'source-identities.json'), 'utf8'));
for (const [path, identity] of Object.entries(sourceHashes)) {
  if (identity && typeof identity === 'object' && 'sha256' in identity)
    equal(sha(await readFile(path)), identity.sha256, `Source identity changed: ${path}`);
}
const result = {
  original: { path: originalPath, sha256: original.sha256, bytes: original.bytes },
  probe: { path: probePath, sha256: probe.sha256, bytes: probe.bytes },
  proof: {
    independentParser: 'src/game/assets/swf.mjs',
    originalTagCount: original.tags.length,
    probeTagCount: probe.tags.length,
    originalAbc,
    addedAbc: probeAbc.at(-1),
    allOriginalPayloadsAndOrderPreserved: true,
    changedOriginalBinding: 0,
    nonbindingTags: original.tags.filter(other).length,
  },
  rootInventory,
  sourceHashes,
};
const fixture = JSON.parse(
  await readFile(
    new URL('../../tests/fixtures/carrier-clock-original.json', import.meta.url),
    'utf8',
  ),
);
equal(original.sha256, fixture.originalSha256, 'Unexpected original SWF identity.');
equal(probe.sha256, fixture.probeSha256, 'Unexpected probe SWF identity.');
equal(
  rootInventory.map((r) => ({
    name: r.name,
    ids: r.ids,
    frames: r.sprites.map((s) => s.frames),
    placements: r.sprites.map((s) => s.placements.length),
  })),
  fixture.roots,
  'Original carrier binding/timeline changed.',
);
const observed = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
const durableTrace = (await readFile(resolve(out, 'trace.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .map(JSON.parse);
equal(durableTrace, observed.trace, 'Durable trace differs from collector result.');
equal(observed.errors, [], 'Browser page errors.');
equal(
  observed.messages.filter((m) => /Error #/.test(m.text)),
  [],
  'AVM errors.',
);
const start = observed.trace.indexOf('BT3_CARRIER_BEGIN');
if (start < 0 || observed.trace.lastIndexOf('BT3_CARRIER_BEGIN') !== start)
  throw new Error('Expected exactly one original probe execution.');
const trace = observed.trace.slice(start);
equal(trace.at(-1), 'BT3_CARRIER_DONE 70', 'Missing final boundary.');
const samples = trace
  .filter((line) => line.startsWith('BT3_CARRIER_SAMPLE '))
  .map((line) => {
    const [
      marker,
      phase,
      label,
      tick,
      actual,
      frame,
      total,
      unparented,
      layerParent,
      children,
      name,
      x,
      y,
      rotation,
      extra,
    ] = line.split(' ');
    if (marker !== 'BT3_CARRIER_SAMPLE' || extra !== undefined)
      throw new Error('Malformed carrier sample.');
    return {
      phase,
      label,
      tick: +tick,
      actual,
      frame: +frame,
      total: +total,
      unparented: unparented === 'true',
      layerParent: layerParent === 'true',
      children: +children,
      name,
      x: +x,
      y: +y,
      rotation: +rotation,
    };
  });
equal(samples.length, fixture.samples, 'Missing or extra samples.');
const byClip = fixture.labels.map((label, i) => {
  const rows = samples.filter((s) => s.label === label);
  const total = i % 2 ? 26 : 25,
    actual = i % 2 ? '_-5z' : '_-YE';
  const expected = ['constructor/0'];
  if (i < 2) expected.push('queued/0');
  if (i >= 4) expected.push('control-attached/0');
  for (let tick = 1; tick <= 70; tick++) {
    expected.push(`enter/${tick}`);
    if (tick === 32 && i < 2) expected.push('pre-register/32', 'post-register/32');
    // The controlled gotoAndStop during callback delivers an additional EXIT.
    if (tick === 50) expected.push('exit/50');
    expected.push(`exit/${tick}`);
  }
  equal(
    rows.map((s) => `${s.phase}/${s.tick}`),
    expected,
    `Incomplete/reordered coordinates: ${label}`,
  );
  const constructorName = rows[0].name;
  if (!/^instance\d+$/.test(constructorName))
    throw new Error('Missing constructor identity label.');
  for (const row of rows) {
    equal(
      [row.actual, row.total, row.children],
      [actual, total, 0],
      `Class/timeline/empty artwork mismatch: ${label}`,
    );
    equal(
      row.frame,
      row.tick ? ((row.tick - 1) % total) + 1 : 1,
      `Clock/reset mismatch: ${label}/${row.phase}/${row.tick}`,
    );
    const registered =
      i < 2 &&
      (row.tick > 32 || row.phase === 'post-register' || (row.tick === 32 && row.phase === 'exit'));
    const reentrantExit =
      row.tick === 50 &&
      row.phase === 'exit' &&
      row === rows.find((s) => s.tick === 50 && s.phase === 'exit');
    const complete =
      row.tick > (i === 0 ? 50 : 52) ||
      (row.tick === (i === 0 ? 50 : 52) && row.phase === 'exit' && !reentrantExit);
    const layerParent = registered && !complete;
    const controlAttached = i >= 4 && row.phase !== 'constructor';
    equal(
      [row.unparented, row.layerParent],
      [!(layerParent || controlAttached), layerParent],
      `Parent identity mismatch: ${label}/${row.phase}/${row.tick}`,
    );
    equal(
      [row.name, row.x, row.y, row.rotation],
      registered ? [`effect_${i + 1}`, 13 + i, 23 + i, 0] : [constructorName, 0, 0, 0],
      `Instance/pose mismatch: ${label}`,
    );
  }
  return {
    label,
    constructorName,
    samples: rows.length,
    total,
    firstEnter: rows.find((s) => s.phase === 'enter'),
    firstExit: rows.find((s) => s.phase === 'exit'),
    preRegister: rows.find((s) => s.phase === 'pre-register'),
    postRegister: rows.find((s) => s.phase === 'post-register'),
    final: rows.at(-1),
  };
});
equal(new Set(byClip.map((clip) => clip.constructorName)).size, 6, 'Clip identities alias.');
equal(
  trace
    .filter((l) => / 50(?: |$)/.test(l))
    .map((line) => {
      const fields = line.split(' ');
      if (fields[0] === 'BT3_CARRIER_SAMPLE' && /^instance\d+$/.test(fields[10]))
        fields[10] = `<${fields[2]}>`;
      return fields.join(' ');
    }),
  fixture.fullBoundaryTrace,
  'Reentrant EXIT/callback/poll boundary changed.',
);
const callbacks = trace.filter((l) => l.startsWith('BT3_CARRIER_CALLBACK '));
equal(callbacks, fixture.callbacks, 'Completion phase or callback-before-detach mismatch.');
const poll50 = trace.filter(
  (l) => / 50(?: |$)/.test(l) && /BT3_CARRIER_(POLL|CALLBACK|BORN)/.test(l),
);
equal(
  poll50,
  fixture.snapshotTrace,
  'Callback-born record was consumed by the same ready snapshot.',
);
const polls = trace.filter((l) => l.startsWith('BT3_CARRIER_POLL '));
const expectedPolls = [];
for (let tick = 32; tick <= 70; tick++) {
  const topBefore = tick <= 50 ? 1 : 0,
    bottomBefore = tick <= 52 ? 1 : 0;
  expectedPolls.push(`BT3_CARRIER_POLL first before ${tick} ${topBefore} ${bottomBefore}`);
  expectedPolls.push(`BT3_CARRIER_POLL first after ${tick} ${topBefore} ${tick < 52 ? 1 : 0}`);
  if (tick === 50)
    expectedPolls.push(
      'BT3_CARRIER_POLL second before 50 1 1',
      'BT3_CARRIER_POLL second after 50 0 1',
    );
}
equal(polls, expectedPolls, 'Actual engine polling/physical removal mismatch.');
const rea = JSON.parse(await readFile(resolve(out, 'rea-evidence.json'), 'utf8'));
const scenario = rea.scenario.normalized_result;
if (scenario.steps.some((s) => s.status !== 'completed'))
  throw new Error('Declared REA action failed.');
const dom = scenario.steps.at(-1).artifacts.dom.value;
equal(sha(Buffer.from(dom.text)), dom.sha256, 'REA DOM digest mismatch.');
const tail = dom.text.match(/<pre id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
if (!tail) throw new Error('REA independent DOM trace absent.');
equal(
  tail.split('\n'),
  observed.trace.slice(-128),
  'Canonical trace differs from independent REA DOM tail.',
);
equal(observed.independentFinalDom, tail, 'Separate final DOM read mismatch.');
const modules = observed.modules.modules;
equal(
  modules.map((m) => m.sha256),
  fixture.runtimeSha256,
  'Loaded runtime module identity mismatch.',
);
for (const module of modules) {
  if (!module.installedComparisons.some((c) => c.sha256 === module.sha256 && c.matchesObserved))
    throw new Error('Loaded bytes do not match installed runtime.');
  if (!observed.responses.some((r) => r.sha256 === module.sha256 && r.status === 200))
    throw new Error('Loaded module response not independently reconciled.');
}
if (
  !observed.responses.some(
    (r) =>
      r.url === observed.origin + '/research.swf' && r.sha256 === probe.sha256 && r.status === 200,
  )
)
  throw new Error('Exact loaded probe bytes unproved.');
equal(observed.browserVersion, fixture.browserVersion, 'Browser identity mismatch.');
result.observation = {
  samples: samples.length,
  byClip,
  callbacks,
  snapshotTrace: poll50,
  repeatedExitTick: 50,
  runtimeModules: observed.modules,
  browser: observed.browserVersion,
  reaEvidenceIds: [rea.discovery.evidence_id, rea.scenario.evidence_id],
  reaCompleteness: scenario.completeness,
  limitations: [
    'Original queue was called and retained its records; glue directly registered those same references after32 ENTER cohorts. Original field queue draining and World.Run were not executed by this probe.',
    'Original engine Run was explicitly polled in glue ENTER_FRAME, not assumed to be a separate original event listener.',
    'Compiled Ruffle source revision, Adobe behavior, wall-clock timing, ordinary-play reachability and full-game parity remain unproved.',
    'REA events remain incomplete/equality-ineligible; its independent DOM corroborates the retained final128 lines, not the complete historical trace.',
  ],
};
await writeFile(resolve(out, 'verified-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      preserved: true,
      samples: samples.length,
      callbacks,
      delayedRegistration: byClip
        .slice(0, 2)
        .map((c) => [c.label, c.preRegister.frame, c.postRegister.frame]),
      reaCompleteness: scenario.completeness,
    },
    null,
    2,
  ),
);
