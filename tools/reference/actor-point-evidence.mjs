/** Independent original payload, raw trace, DOM, ancestry and binary-word checks.
 * No candidate transform, WorldDisplays, renderer or simulation imports.
 * Callers own CAPTURE; only derived proof/candidate outputs may be written there.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { decompressSWF, readHeader, iterTags, u16 } from '../../src/game/assets/swf.mjs';

export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const fields = [
  'scaleX',
  'scaleY',
  'x',
  'y',
  'rotation',
  ...['own', 'concatenated'].flatMap((prefix) =>
    ['a', 'b', 'c', 'd', 'tx', 'ty'].map((p) => `${prefix}.${p}`),
  ),
  ...['input', 'stage', 'local'].flatMap((prefix) => ['x', 'y'].map((p) => `${prefix}.${p}`)),
];
const roles = ['root', 'actorLayer', 'avatar'];
const cohort = (phase, age, roles) =>
  roles.flatMap((role) =>
    ['p0', 'p1', 'p2', 'p3', 's0', 's1'].map((p) => ({
      phase,
      age,
      role: `${role}-${p}`,
      kind: p.startsWith('p') ? 'roundtrip' : 'stage',
    })),
  );
const expected = [
  ...[0, 51, 119].flatMap((age) => cohort('collapse', age, roles)),
  ...cohort('main-fraction', 119, ['root', 'avatar']),
  ...['current', 'nextRoot', 'nextBullet', 'nextTop'].flatMap((role) =>
    [0, 1, 2, 3].map((i) => ({
      phase: 'conversion',
      age: 119,
      role: `${role}-p${i}`,
      kind: 'transfer',
    })),
  ),
  ...[90, 30, 60].flatMap((angle) => [
    ...['p0', 'p1', 'p2'].map((p) => ({
      phase: `rotation${angle}`,
      age: 119,
      role: `avatar-${p}`,
      kind: 'roundtrip',
    })),
    { phase: `rotation${angle}`, age: 119, role: 'position-p0', kind: 'transfer' },
  ]),
  ...cohort('detach', 119, ['root', 'actorLayer']),
  ...cohort('reparent', 119, ['avatar']),
];
const classes = {
  root: 'Bubblefield',
  actorLayer: 'flash.display::MovieClip',
  avatar: '_-Zx',
  current: 'Bubblefield',
  nextRoot: 'Bubblefield',
  nextBullet: '_-dl',
  nextTop: '_-My',
};
function ancestry({ phase, role }) {
  const name = role.split('-')[0];
  if (name === 'position')
    return ['BTAGameWorld', 'BT3ActorPointProbe', 'Bubblefield', 'BTAGameWorld'];
  const parent =
    phase === 'detach' && name === 'root'
      ? 'null'
      : phase === 'reparent'
        ? 'flash.display::MovieClip'
        : name === 'actorLayer'
          ? 'Bubblefield'
          : 'BTAGameWorld';
  return phase === 'conversion'
    ? ['BTAGameWorld', 'BT3ActorPointProbe', classes[name], parent]
    : [classes[name], parent, classes[name], parent];
}
export const design = {
  stage: [550, 450],
  worldXY: [275, 225],
  receiverXY: [-140, 70],
  receiverScale: 1,
  avatarXY: [0, 0],
  avatarScale: 1,
  actorLayer: 'actual original enemyLayer_mc1547; identity',
  collapseCalls: 119,
  sampleAges: [0, 51, 119],
  mainFractionRequested: [0.07, -0.07],
  mainFractionPhases: ['main-fraction', 'detach', 'reparent'],
  roundtripInputs: [
    [0, 0],
    [100, 40],
    [0.079, 0.149],
    [-0.15, 0.25],
  ],
  stageInputs: [
    [135.079, 295.149],
    [-0.15, 0.25],
  ],
  nextRootXY: [700, -90],
  nextBulletTopCopy: 'CURRENT root(-140,70), unit scale, actual World siblings',
  transferInputs: [
    [0, 0],
    [100, 40],
    [0.079, 0.149],
    [-77.35, 35.7],
  ],
  avatarRotations: [90, 30, 60],
  rotatedInputs: [
    [0.079, 0.149],
    [100, 40],
    [-0.15, 0.25],
  ],
  positionInput:
    'actual avatar.x/y getters, transformed by its actual parent World, then actual field.globalToLocal',
  reparent:
    'actual addChild reparents original avatar under retained1547 in detached field; own119 compensation/scale retained',
  scope:
    'Preserved original Main/World/field/avatar classes. Original public Setup(Main), TankData ImportTankData/_-Tr(1,world), DeathAnimPart2 and119 synchronous ShrinkBubblefield(null) calls execute; only newly added ENTER_FRAME listener is removed. Original SHAKE/FLASH/RNG execute unchanged; Main screen-effects ENTER_FRAME does not run between calls. localToGlobal/globalToLocal and ByteArray are actual builtins. Next construction/current-position copies, separate Main setters, avatar rotation setters, removeChild and reparent are declared glue. No original World.Run, private factory, full DeathAnimPart3/Destroy/arrival, ordinary encounter, event schedule, global RNG, compiled runtime revision, Adobe, pixel/audio or full-game proof. Detached concatenatedMatrix is recorded as its own API, never the Point oracle. Round-trip output is measured, not presumed identity.',
};
export function decode(words) {
  return words.map(([high, low]) => {
    const bytes = Buffer.alloc(8);
    bytes.writeUInt32BE(high, 0);
    bytes.writeUInt32BE(low, 4);
    return bytes.readDoubleBE();
  });
}
const bindings = (body) => {
  const entries = [];
  let at = 2;
  for (let i = 0; i < u16(body, 0); i++) {
    const id = u16(body, at);
    at += 2;
    const end = body.indexOf(0, at);
    assert(end >= 0, 'Unterminated original binding');
    entries.push([id, new TextDecoder().decode(body.slice(at, end))]);
    at = end + 1;
  }
  assert.equal(at, body.length, 'Trailing binding data');
  return entries;
};
async function parse(path) {
  const raw = await readFile(path);
  const { bytes } = await decompressSWF(new Uint8Array(raw));
  const header = readHeader(bytes);
  let at = header.tagsOffset;
  const tags = [...iterTags(bytes, at)].map((t) => {
    const start = at;
    const tagHeader = u16(bytes, at);
    at += 2 + ((tagHeader & 63) === 63 ? 4 : 0) + t.len;
    return { ...t, raw: bytes.slice(start, at) };
  });
  return {
    sha256: sha(raw),
    version: bytes[3],
    header: sha(bytes.slice(8, header.tagsOffset)),
    trailer: sha(bytes.slice(at)),
    tags,
  };
}
export async function captureEvidence(originalPath, probePath, emissionPath, capture) {
  const original = await parse(originalPath),
    probe = await parse(probePath);
  const emission = JSON.parse(await readFile(emissionPath, 'utf8'));
  assert.equal(original.sha256, emission.original_sha256, 'Changed original input');
  assert.equal(probe.sha256, emission.probe_sha256, 'Changed probe/emission identity');
  assert.deepEqual(emission.fields, fields, 'Changed fields');
  assert.deepEqual(emission.controls, expected, 'Changed emitter cohort');
  assert.equal(
    sha(await readFile(new URL('./actor-point-probe.py', import.meta.url))),
    emission.emitter_sha256,
    'Changed emitter source',
  );
  assert.equal(original.version, probe.version, 'Changed movie version');
  assert.equal(original.header, probe.header, 'Changed movie header payload');
  assert.equal(original.trailer, probe.trailer, 'Changed data after final original tag');
  const abc = (t) => t.code === 72 || t.code === 82;
  const originalAbc = original.tags.filter(abc).map((t) => sha(t.body));
  const probeAbc = probe.tags.filter(abc).map((t) => sha(t.body));
  assert.equal(probeAbc.length, originalAbc.length + 1, 'Expected exactly one added glue ABC');
  assert.deepEqual(probeAbc.slice(0, -1), originalAbc, 'Changed original ABC bytes/order');
  assert.deepEqual(
    originalAbc,
    emission.preserved_original_abc_tag_payloads,
    'Changed original ABC declaration',
  );
  const glue = probe.tags.filter(abc).at(-1).body;
  const zero = glue.indexOf(0, 4);
  assert(zero >= 0, 'Missing glue ABC name');
  assert.equal(
    sha(glue.slice(zero + 1)),
    emission.added_probe_abc_sha256,
    'Changed added glue ABC',
  );
  let pi = 0,
    added = 0,
    renamed = 0;
  for (const source of original.tags) {
    let dest = probe.tags[pi++];
    if (dest?.code === 82 && sha(dest.body) === probeAbc.at(-1)) {
      added++;
      dest = probe.tags[pi++];
    }
    assert.equal(dest?.code, source.code, 'Changed original tag order');
    if (source.code === 76) {
      const a = bindings(source.body),
        b = bindings(dest.body);
      assert.deepEqual(
        b.map(([id, name]) => [id, id === 0 ? 'Main' : name]),
        a,
        'Changed non-document binding',
      );
      renamed += b.filter(([id, name]) => id === 0 && name === 'BT3ActorPointProbe').length;
    } else assert.deepEqual(dest.raw, source.raw, 'Changed original tag bytes/header/order');
  }
  assert.equal(pi, probe.tags.length, 'Unexpected extra tags');
  assert.equal(added, 1);
  assert.equal(renamed, 1);
  const sourceHashes = emission.source_sha256;
  assert.equal(Object.keys(sourceHashes).length, 11, 'Missing qualified source identities');
  for (const [path, hash] of Object.entries(sourceHashes)) {
    assert(/^export_pcode\/scripts\/[\w-]+\.pcode$/.test(path), 'Unexpected source path');
    assert.equal(
      sha(await readFile(resolve(dirname(originalPath), path))),
      hash,
      `Changed qualified source ${path}`,
    );
  }
  const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
  const rawTrace = (await readFile(resolve(capture, 'trace.jsonl'), 'utf8'))
    .trimEnd()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(observed.trace, rawTrace, 'Changed collector versus durable raw trace');
  assert.deepEqual(observed.errors, [], 'Page errors');
  assert(
    !observed.messages.some((m) =>
      /Error #|recursively acquire mutex|Maximum call stack/.test(m.text),
    ),
    'Original AVM/capture failed',
  );
  const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
  assert.equal(scenario.operation, 'capture_browser_scenario', 'Not REA scenario evidence');
  const steps = scenario.normalized_result.steps;
  assert(
    steps.every((s) => s.status === 'completed'),
    'Incomplete REA actions',
  );
  assert(
    !scenario.normalized_result.events.items.some(
      (e) => e.kind === 'page-error' || /Error #/.test(e.text ?? ''),
    ),
    'Independent REA runtime error',
  );
  const domValue = steps.at(-1).artifacts.dom.value;
  assert.equal(sha(domValue.text), domValue.sha256, 'Changed DOM digest');
  assert.equal(Buffer.byteLength(domValue.text), domValue.bytes, 'Changed DOM byte count');
  const retained = domValue.text.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert(retained, 'Missing independent REA trace');
  const pointLines = (lines) => lines.filter((s) => s.startsWith('BT3_ACTOR_POINT'));
  const lines = pointLines(observed.trace);
  assert.deepEqual(
    pointLines(retained.split('\n')),
    lines,
    'Collector differs from independent REA DOM',
  );
  assert.equal(lines.length, expected.length + 3, 'Missing/extra control rows');
  assert.equal(lines[0], 'BT3_ACTOR_POINT_BEGIN 550 450', 'Changed stage control');
  assert.equal(lines[1], 'BT3_ACTOR_POINT_AVATAR A10000063', 'Changed original avatar blueprint');
  assert.equal(lines.at(-1), 'BT3_ACTOR_POINT_DONE', 'Missing completion');
  const samples = expected.map((control, index) => {
    const parts = lines[index + 2].split(' '),
      [
        marker,
        phase,
        age,
        role,
        kind,
        sourceClass,
        sourceParent,
        sourceMatches,
        receiverClass,
        receiverParent,
        receiverMatches,
        ...raw
      ] = parts;
    assert.equal(marker, 'BT3_ACTOR_POINT_BITS');
    assert.deepEqual(
      { phase, age: Number(age), role, kind },
      control,
      'Missing/reordered/changed control cohort',
    );
    assert.deepEqual(
      [sourceClass, sourceParent, receiverClass, receiverParent],
      ancestry(control),
      'Wrong physical parent/class',
    );
    assert.equal(sourceMatches, 'true', 'Wrong actual source parent identity');
    assert.equal(receiverMatches, 'true', 'Wrong actual receiver parent identity');
    assert.equal(raw.length, fields.length * 2, 'Missing numeric getters/Point values');
    assert(
      raw.every((w) => /^(0|[1-9]\d*)$/.test(w) && Number(w) <= 0xffffffff),
      'Invalid binary uint word',
    );
    const words = Array.from({ length: fields.length }, (_, i) =>
      raw.slice(i * 2, i * 2 + 2).map(Number),
    );
    const numbers = decode(words);
    assert(numbers.every(Number.isFinite), 'Nonfinite original getter');
    const i = Number(role.at(-1));
    const requested =
      kind === 'stage'
        ? design.stageInputs[i]
        : phase === 'conversion'
          ? design.transferInputs[i]
          : role.startsWith('position')
            ? [-77.35, 35.7]
            : phase.startsWith('rotation')
              ? design.rotatedInputs[i]
              : design.roundtripInputs[i];
    assert.deepEqual(numbers.slice(17, 19), requested, 'Wrong supplied original Point input');
    return {
      ...control,
      sourceClass,
      sourceParent,
      sourceMatches: true,
      receiverClass,
      receiverParent,
      receiverMatches: true,
      words,
    };
  });
  assert(
    observed.responses.some(
      (r) => r.url.endsWith('/research.swf') && r.status === 200 && r.sha256 === probe.sha256,
    ),
    'Loaded original probe bytes absent',
  );
  assert.equal(observed.modules.modules.length, 3, 'Incomplete actual loaded module inventory');
  for (const module of observed.modules.modules) {
    const matches = module.installedComparisons.filter(
      (f) => f.matchesObserved && f.sha256 === module.sha256 && f.bytes === module.bytes,
    );
    assert(matches.length, 'Loaded/installed module mismatch');
    for (const entry of matches) {
      assert(/^[\w.-]+\.(js|wasm)$/.test(entry.name), 'Unexpected module path');
      const bytes = await readFile(resolve('node_modules/@ruffle-rs/ruffle', entry.name));
      assert.equal(sha(bytes), module.sha256, 'Forged runtime identity');
      assert.equal(bytes.length, module.bytes);
    }
  }
  assert.equal(observed.viewerModules.length, 1, 'Missing loaded viewer module');
  const viewer = observed.viewerModules[0];
  assert(
    observed.responses.some(
      (r) =>
        r.url === viewer.url &&
        r.status === 200 &&
        r.sha256 === viewer.sha256 &&
        r.bytes === viewer.bytes,
    ),
    'Loaded/response viewer mismatch',
  );
  const fixture = {
    scope: design.scope,
    originalSha256: original.sha256,
    probeSha256: probe.sha256,
    qualifiedSourceHashes: sourceHashes,
    fields,
    design,
    emitterSha256: emission.emitter_sha256,
    addedGlueAbcSha256: emission.added_probe_abc_sha256,
    originalAbcPayloadHashes: originalAbc,
    runtimeModules: observed.modules.modules
      .map(({ sha256, bytes }) => ({ sha256, bytes }))
      .sort((a, b) => a.sha256.localeCompare(b.sha256)),
    viewer: { sha256: viewer.sha256, bytes: viewer.bytes },
    samples,
  };
  const proof = {
    originalTagCount: original.tags.length,
    probeTagCount: probe.tags.length,
    originalAbcPayloadHashes: originalAbc,
    allOriginalPayloadsTagHeadersAndOrderPreserved: true,
    movieHeaderPreserved: true,
    onlyDocumentBindingChanged: true,
    addedAbcPayloadHash: probeAbc.at(-1),
    independentParser: 'src/game/assets/swf.mjs',
    binarySamples: samples.length,
    binaryValues: samples.length * fields.length,
    rawTraceAndIndependentDomAgree: true,
    domTraceScope:
      'All112 declared numeric samples and begin/avatar/done retained, within viewer128-row tail; no pre-traceObserver startup-event completeness claim.',
    evidenceId: scenario.evidence_id,
    reaCompleteness: scenario.normalized_result.completeness,
    browser: observed.version,
    runtimeModules: fixture.runtimeModules,
    viewer: fixture.viewer,
    scope: design.scope,
  };
  await writeFile(
    resolve(capture, 'verified-actor-point-preservation.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  return { fixture, proof };
}
