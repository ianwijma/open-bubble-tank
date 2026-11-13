/** Independent preservation and bounded observation verification.
 * node tools/reference/pickup-clock-verify.mjs ORIGINAL PROBE CAPTURE_DIR
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

const [originalPath, probePath, out, variant] = process.argv.slice(2);
const insideEnter = variant === '--inside-enter';
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
    documentChanges += b.filter(([id, name]) => id === 0 && name === 'BT3PickupClockProbe').length;
  } else equal(sha(dest.body), sha(source.body), 'Original payload changed.');
}
equal(pi, probe.tags.length, 'Unexpected extra tags.');
equal(inserted, 1, 'Expected one insertion.');
equal(documentChanges, 1, 'Expected one CID0 binding change.');
const roots = ['_-Bd', '_-Oh', '_-5A'];
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
// This verifier imports neither the pickup owner nor SwfClip/ClipTimeline.
const fixturePath = process.env.BT3_PICKUP_VERIFY_FIXTURE;
if (fixturePath && !resolve(fixturePath).startsWith(resolve(out) + sep))
  throw new Error('Control fixture must be caller-owned under capture output.');
const fixture = JSON.parse(
  await readFile(
    fixturePath ?? new URL('../../tests/fixtures/pickup-clock-original.json', import.meta.url),
    'utf8',
  ),
);
const cohort = fixture[insideEnter ? 'inside' : 'before'];
equal(original.sha256, fixture.originalSha256, 'Original identity differs.');
equal(probe.sha256, cohort.probeSha256, 'Probe identity differs.');
equal(
  rootInventory.map((r) => [r.name, r.ids, r.sprites.map((s) => s.frames)]),
  [
    ['_-Bd', [1816], [40]],
    ['_-Oh', [1817], [40]],
    ['_-5A', [1820], [31]],
  ],
  'Pickup class binding differs.',
);
const observed = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
const durable = (await readFile(resolve(out, 'trace.jsonl'), 'utf8'))
  .trim()
  .split('\n')
  .map(JSON.parse);
equal(durable, observed.trace, 'Durable trace differs.');
equal(observed.errors, [], 'Browser errors.');
equal(
  observed.messages.filter((m) => /Error #/.test(m.text)),
  [],
  'AVM errors.',
);
const start = durable.indexOf('BT3_PICKUP_BEGIN');
if (start < 0 || durable.lastIndexOf('BT3_PICKUP_BEGIN') !== start)
  throw new Error('Probe must execute once.');
const trace = durable.slice(start);
equal(trace.at(-1), 'BT3_PICKUP_DONE 180', 'Missing final boundary.');
equal(sha(Buffer.from(trace.join('\n'))), cohort.traceSha256, 'Exact raw trace differs.');
const samples = [],
  children = [];
for (let index = 1; index < trace.length - 1; index++) {
  const words = trace[index].split(' ');
  if (words[0] !== 'BT3_PICKUP_SAMPLE' || words.length !== 17)
    throw new Error('Malformed/missing root sample.');
  const [
    _,
    phase,
    label,
    tick,
    actual,
    frame,
    total,
    unparented,
    layerParent,
    count,
    name,
    x,
    y,
    rotation,
    value,
    collected,
    r,
  ] = words;
  const row = {
    phase,
    label,
    tick: +tick,
    actual,
    frame: +frame,
    total: +total,
    unparented: unparented === 'true',
    layerParent: layerParent === 'true',
    count: +count,
    name,
    x: +x,
    y: +y,
    rotation: +rotation,
    value: +value,
    collected: collected === 'true',
    r: +r,
  };
  samples.push(row);
  const childWords = trace[++index]?.split(' ');
  if (childWords?.[0] !== 'BT3_PICKUP_CHILD' || childWords.length !== 10)
    throw new Error('Malformed/missing child sample.');
  const [marker, cp, cl, ct, cn, cx, cy, sx, sy, cf] = childWords;
  equal([cp, cl, +ct], [phase, label, +tick], 'Child coordinates differ.');
  children.push({ name: cn, x: +cx, y: +cy, sx: +sx, sy: +sy, frame: +cf });
}
equal(samples.length, cohort.samples, 'Sample count differs.');
const labels = ['held', 'parent', 'removed', 'spawn'].flatMap((p) => [1, 5, 50].map((v) => p + v));
const rowsByLabel = labels.map((label) => samples.filter((s) => s.label === label));
const naturalWraps = [],
  selfTargets = [],
  birth = insideEnter ? 1 : 0;
for (let i = 0; i < 12; i++) {
  const rows = rowsByLabel[i],
    denomination = [1, 5, 50][i % 3],
    total = i % 3 === 2 ? 31 : 40;
  const expected = [i < 9 ? `constructor/${birth}` : `spawned/${birth}`];
  if (i < 9) expected.push(`setup/${birth}`);
  if (i >= 3 && i < 9) expected.push(`attached/${birth}`);
  for (let tick = 1; tick <= 180; tick++) {
    expected.push(`enter/${tick}`);
    if (tick === 20 && i >= 6 && i < 9) expected.push('removed/20');
    if (tick === 90 && i < 2) expected.push('pre-goto/90', 'post-goto/90');
    expected.push(`exit/${tick}`);
  }
  // EXIT is reentrant during original goto/frame scripts. Collapse only adjacent
  // duplicate exit coordinates; exact raw multiplicity/order is separately hashed.
  const collapsed = rows
    .map((s) => `${s.phase}/${s.tick}`)
    .filter((s, j, a) => j === 0 || s !== a[j - 1] || !s.startsWith('exit/'));
  equal(
    collapsed.filter((s) => !s.startsWith('exit/')),
    expected.filter((s) => !s.startsWith('exit/')),
    `Missing/reordered controls: ${labels[i]}`,
  );
  for (let tick = 1; tick <= 180; tick++)
    if (!rows.some((s) => s.phase === 'exit' && s.tick === tick))
      throw new Error('Missing EXIT cohort.');
  const name = rows[0].name;
  for (const row of rows) {
    equal(
      [row.actual, row.total, row.count, row.name],
      [['_-Bd', '_-Oh', '_-5A'][i % 3], total, 1, name],
      'Class/count/identity mismatch.',
    );
    const attached =
      i >= 3 &&
      row.phase !== 'constructor' &&
      row.phase !== 'setup' &&
      !(i >= 6 && i < 9 && (row.tick > 20 || (row.tick === 20 && row.phase !== 'enter')));
    equal([row.unparented, row.layerParent], [!attached, attached], 'Parent retention mismatch.');
    equal(
      [row.x, row.y, row.value, row.collected],
      i >= 9
        ? [20 + i, 30 + i, denomination, false]
        : [0, 0, row.phase === 'constructor' ? 1 : denomination, false],
      'Setup/spawn writes mismatch.',
    );
    if (i < 9) equal(row.rotation, 0, 'Direct Setup changed rotation.');
    else if (
      !Number.isInteger(row.rotation) ||
      row.rotation < -180 ||
      row.rotation > 180 ||
      row.rotation !== rows[0].rotation
    )
      throw new Error('Source spawn rotation differs.');
  }
  for (let tick = 1; tick <= 180; tick++) {
    const enter = rows.find((s) => s.phase === 'enter' && s.tick === tick),
      exits = rows.filter((s) => s.phase === 'exit' && s.tick === tick),
      final = exits.at(-1);
    const previous = rows.filter((s) => s.phase === 'exit' && s.tick === tick - 1).at(-1);
    const expectedEnter =
      tick === 1
        ? 1
        : insideEnter && tick === 2 && previous.frame === 1
          ? previous.frame
          : (previous.frame % total) + 1;
    equal(enter.frame, expectedEnter, `ENTER advancement differs ${labels[i]}/${tick}`);
    const scripted =
      i % 3 !== 2 &&
      (tick === 1 ||
        (enter.frame === 1 && !(insideEnter && tick === 2 && enter.frame === 1)) ||
        (tick === 90 && i < 2));
    if (scripted) {
      if (!Number.isInteger(final.r) || final.r < 0 || final.r > 10)
        throw new Error('Invalid original r.');
      equal(final.frame, Math.max(1, final.r), 'Registered random-jump pose differs.');
      if (tick > 2 && tick !== 90) naturalWraps.push([labels[i], tick, final.r]);
      if (final.r <= 1) selfTargets.push([labels[i], tick, final.r]);
    } else {
      equal(final.frame, enter.frame, 'Unexpected EXIT frame change.');
      equal(String(final.r), String(enter.r), 'Unexpected r write.');
    }
  }
}
if (
  naturalWraps.length < 24 ||
  (!insideEnter && !selfTargets.some((s) => s[2] === 0)) ||
  !selfTargets.some((s) => s[2] === 1)
)
  throw new Error('Insufficient wrap/self-target evidence.');
equal(new Set(rowsByLabel.map((rows) => rows[0].name)).size, 12, 'Root identity aliases.');
// Independently fold raw original placement tags, never production displayList.
const poses = new Map();
for (const root of rootInventory) {
  const sprite = root.sprites[0];
  for (let frame = 1; frame <= sprite.frames; frame++) {
    let p;
    for (const placement of sprite.placements)
      if (placement.frame <= frame) p = { ...p, ...placement };
    poses.set(`${root.name}/${frame}`, p);
  }
}
let maxPoseError = 0;
for (let index = 0; index < samples.length; index++) {
  const row = samples[index],
    child = children[index],
    p = poses.get(`${row.actual}/${row.frame}`),
    m = p.matrix;
  const expected = [m.tx / 20, m.ty / 20, Math.hypot(m.a, m.b), Math.hypot(m.c, m.d)];
  const actual = [child.x, child.y, child.sx, child.sy];
  for (let k = 0; k < 4; k++) {
    const error = Math.abs(actual[k] - expected[k]);
    maxPoseError = Math.max(maxPoseError, error);
    if (error > 1e-7)
      throw new Error(
        `Child pose differs ${row.label}/${row.phase}/${row.tick}/${k}: ${actual[k]} != ${expected[k]}`,
      );
  }
  equal(child.frame, row.actual === '_-5A' ? 1 : 999, 'Nested1819 frame differs.');
  const first = children[samples.findIndex((s) => s.label === row.label)].name;
  equal(child.name, first, 'Child identity reset through wrap/removal.');
}
const rea = JSON.parse(await readFile(resolve(out, 'rea-evidence.json'), 'utf8'));
const scenario = rea.scenario.normalized_result;
if (scenario.steps.some((s) => s.status !== 'completed')) throw new Error('REA action failed.');
const dom = scenario.steps.at(-1).artifacts.dom.value;
equal(sha(Buffer.from(dom.text)), dom.sha256, 'REA DOM digest differs.');
const tail = dom.text.match(/<pre id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
equal(tail?.split('\n'), durable.slice(-2048), 'Independent REA DOM tail differs.');
equal(observed.independentFinalDom, tail, 'Separate final DOM differs.');
equal(
  observed.modules.modules.map((m) => m.sha256),
  fixture.runtimeSha256,
  'Loaded modules differ.',
);
for (const module of observed.modules.modules) {
  if (
    !module.installedComparisons.some((c) => c.matchesObserved && c.sha256 === module.sha256) ||
    !observed.responses.some((r) => r.status === 200 && r.sha256 === module.sha256)
  )
    throw new Error('Runtime response/installed bytes mismatch.');
}
if (
  !observed.responses.some(
    (r) =>
      r.url === observed.origin + '/research.swf' && r.status === 200 && r.sha256 === probe.sha256,
  )
)
  throw new Error('Loaded probe identity differs.');
equal(observed.browserVersion, fixture.browserVersion, 'Browser identity differs.');
result.observation = {
  traceSha256: sha(Buffer.from(trace.join('\n'))),
  samples: samples.length,
  childPoses: children.length,
  maxPoseError,
  naturalWraps,
  selfTargets,
  reaEvidenceIds: [rea.discovery.evidence_id, rea.scenario.evidence_id],
  reaCompleteness: scenario.completeness,
  modules: observed.modules,
  limitations: [
    'r samples cannot count repeated writes of the same value or prove complete source entropy ordering.',
    'Original SpawnLifeBubbles and Setup execute with a valid world/field and null avatar; no World.Run, pickup Run, outside callback or ordinary gameplay is executed.',
    'REA event completeness remains independent of the full collector trace; DOM corroborates final2048 lines only.',
    'No Adobe, compiled-source revision, global RNG/event, pixel/audio or full-game parity proof.',
  ],
};
await writeFile(resolve(out, 'verified-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.observation, null, 2));
