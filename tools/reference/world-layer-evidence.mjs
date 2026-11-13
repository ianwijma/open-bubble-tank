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
  'alpha',
  ...['own', 'concatenated'].flatMap((prefix) =>
    ['a', 'b', 'c', 'd', 'tx', 'ty'].map((p) => `${prefix}.${p}`),
  ),
  'point0.x',
  'point0.y',
  'point100x40.x',
  'point100x40.y',
];
const roles = [
  'root',
  'bottom',
  'top',
  'bullet',
  'highlight',
  'avatar',
  'background',
  'under',
  'screen',
  'world',
  'main',
];
const classes = {
  root: 'Bubblefield',
  bottom: '_-Rt',
  top: '_-My',
  bullet: '_-dl',
  highlight: '_-Zs',
  avatar: '_-Zx',
  background: 'flash.display::MovieClip',
  under: 'flash.display::MovieClip',
  screen: 'flash.display::MovieClip',
  world: 'BTAGameWorld',
  main: 'BT3WorldLayerProbe',
  nextRoot: 'Bubblefield',
  nextBullet: '_-dl',
  nextTop: '_-My',
  nextHighlight: '_-Zs',
};
const parents = Object.fromEntries(roles.map((role) => [role, 'BTAGameWorld']));
Object.assign(parents, {
  bottom: 'flash.display::MovieClip',
  background: 'Bubblefield',
  under: 'Bubblefield',
  world: 'BT3WorldLayerProbe',
  main: 'flash.display::Stage',
});
const expected = [
  ...[0, 1, 2, 51, 119].flatMap((age) => roles.map((role) => ({ phase: 'collapse', age, role }))),
  ...roles.map((role) => ({ phase: 'main-fraction', age: 119, role })),
  ...roles.map((role) => ({ phase: 'finish-glue', age: 120, role })),
  ...['nextRoot', 'nextBullet', 'nextTop', 'nextHighlight'].map((role) => ({
    phase: 'next-glue',
    age: 120,
    role,
  })),
  ...['root', 'bottom', 'top', 'bullet', 'highlight', 'background', 'under', 'world', 'main'].map(
    (role) => ({ phase: 'detach-glue', age: 120, role }),
  ),
];
export const design = {
  stage: [550, 450],
  worldXY: [275, 225],
  receiverXY: [-140, 70],
  receiverScale: 1,
  avatarXY: [0, 0],
  avatarScale: 1,
  waveChildAndHighlightScale: 1.4,
  bottomXY: [0, 0],
  bottomParent: 'original1540-under-receiver1551',
  collapseCalls: 119,
  sampleAges: [0, 1, 2, 51, 119],
  finishAge: 120,
  finishHas120thShrink: false,
  mainFractionRequested: [0.07, -0.07],
  mainFractionPhases: ['main-fraction', 'detach-glue'],
  pointInputs: [
    [0, 0],
    [100, 40],
  ],
  nextRootXY: [700, -90],
  nextBulletTopCopy: 'current receiver root, not next root',
  scope:
    'Original Setup(Main), TankData import/default0/_-Tr(1,world), DeathAnimPart2 and synchronous ShrinkBubblefield(null) calls on preserved original classes. The newly added ENTER_FRAME listener is removed before manual calls. Original SHAKE/FLASH/RNG are unmodified; screen-effects ENTER_FRAME does not run between synchronous calls. Finish transform prefix, next constructors/position copies and detach are explicitly glue. No original DeathAnimPart3/Destroy/World.Run/arrival, event schedule, global RNG, Adobe, pixel/audio or full-game proof. concatenatedMatrix is its own API observation; detached values may differ from localToGlobal.',
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
      renamed += b.filter(([id, name]) => id === 0 && name === 'BT3WorldLayerProbe').length;
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
  const worldLines = (lines) => lines.filter((s) => s.startsWith('BT3_WORLD'));
  const lines = worldLines(observed.trace);
  assert.deepEqual(
    worldLines(retained.split('\n')),
    lines,
    'Collector differs from independent REA DOM',
  );
  assert.equal(lines.length, expected.length + 3, 'Missing/extra control rows');
  assert.equal(lines[0], 'BT3_WORLD_BEGIN 550 450', 'Changed stage control');
  assert.equal(lines[1], 'BT3_WORLD_AVATAR A10000063', 'Changed original avatar blueprint');
  assert.equal(lines.at(-1), 'BT3_WORLD_DONE', 'Missing completion');
  const samples = expected.map((control, index) => {
    const parts = lines[index + 2].split(' '),
      [marker, phase, age, role, className, parentClass, parentMatches, ...raw] = parts;
    assert.equal(marker, 'BT3_WORLD_BITS');
    assert.deepEqual(
      { phase, age: Number(age), role },
      control,
      'Missing/reordered/changed control cohort',
    );
    assert.equal(className, classes[role], 'Wrong original class');
    const expectedParent =
      phase === 'detach-glue' && ['root', 'bottom', 'top', 'bullet', 'highlight'].includes(role)
        ? 'null'
        : (parents[role] ?? 'BTAGameWorld');
    assert.equal(parentClass, expectedParent, 'Wrong parent class');
    assert.equal(parentMatches, 'true', 'Wrong actual parent identity');
    assert.equal(raw.length, fields.length * 2, 'Missing numeric getters/Point values');
    assert(
      raw.every((w) => /^(0|[1-9]\d*)$/.test(w) && Number(w) <= 0xffffffff),
      'Invalid binary uint word',
    );
    const words = Array.from({ length: fields.length }, (_, i) =>
      raw.slice(i * 2, i * 2 + 2).map(Number),
    );
    assert(decode(words).every(Number.isFinite), 'Nonfinite original getter');
    return { ...control, className, parentClass, parentMatches: true, words };
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
      'All90 declared numeric samples and begin/avatar/done retained, within viewer128-row tail; no pre-traceObserver startup-event completeness claim.',
    evidenceId: scenario.evidence_id,
    reaCompleteness: scenario.normalized_result.completeness,
    browser: observed.version,
    runtimeModules: fixture.runtimeModules,
    viewer: fixture.viewer,
    scope: design.scope,
  };
  await writeFile(
    resolve(capture, 'verified-world-layer-preservation.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  return { fixture, proof };
}
