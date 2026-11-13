/** Independent original-byte/trace/runtime evidence. No native effect pose imports. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { decompressSWF, readHeader, iterTags, u16 } from '../../src/game/assets/swf.mjs';
import { audit } from './effect-clock-source.mjs';
export const sha = (b) => createHash('sha256').update(b).digest('hex');
export const fields = [
  'x',
  'y',
  'scaleX',
  'scaleY',
  'rotation',
  'alpha',
  ...['a', 'b', 'c', 'd', 'tx', 'ty'].map((s) => 'own.' + s),
];
export function decode(words) {
  const b = Buffer.alloc(8);
  const result = [];
  for (let i = 0; i < words.length; i += 2) {
    b.writeUInt32BE(words[i], 0);
    b.writeUInt32BE(words[i + 1], 4);
    result.push(b.readDoubleBE());
  }
  return result;
}
export function normalize(line) {
  const tokens = line.split(' ');
  // Runtime auto-names vary with unrelated startup construction; Dictionary IDs do not.
  if (tokens[0] === 'BT3_EFFECT_BITS' && /^instance\d+$/.test(tokens[11])) tokens[11] = '$auto';
  return tokens.join(' ');
}
export function pack(lines) {
  const strings = [],
    poses = [],
    records = [],
    sm = new Map(),
    pm = new Map();
  const intern = (s) => {
    if (!sm.has(s)) {
      sm.set(s, strings.length);
      strings.push(s);
    }
    return sm.get(s);
  };
  for (const line of lines) {
    const t = normalize(line).split(' ');
    if (t[0] === 'BT3_EFFECT_BITS') {
      const words = t.slice(16).map(Number),
        key = words.join(',');
      if (!pm.has(key)) {
        pm.set(key, poses.length);
        poses.push(words.map((w) => w.toString(16).padStart(8, '0')).join(''));
      }
      records.push([...t.slice(0, 16).map(intern), pm.get(key)]);
    } else records.push(t.map(intern));
  }
  return { strings, poses, records: records.map((r) => r.join(',')) };
}
/** @returns {string[]} */
export function unpack(contract) {
  return contract.records.map((record) => {
    const r = record.split(',').map(Number);
    return r.length === 17 && contract.strings[r[0]] === 'BT3_EFFECT_BITS'
      ? [
          ...r.slice(0, 16).map((i) => contract.strings[i]),
          ...contract.poses[r[16]].match(/.{8}/g).map((w) => parseInt(w, 16)),
        ].join(' ')
      : r.map((i) => contract.strings[i]).join(' ');
  });
}
/** @typedef {{tick:number,phase:string,label:string,path:string,kind:string,id:number,className:string,parentId:number,parentNull:boolean,parentTop:boolean,name:string,frame:number,total:number,isPlaying:string,children:number,words:number[]}} EffectClockRow */
/** @returns {EffectClockRow[]} */
export function rows(contract) {
  return unpack(contract)
    .filter((s) => s.startsWith('BT3_EFFECT_BITS '))
    .map((s) => {
      const t = s.split(' ');
      return {
        tick: +t[1],
        phase: t[2],
        label: t[3],
        path: t[4],
        kind: t[5],
        id: +t[6],
        className: t[7],
        parentId: +t[8],
        parentNull: t[9] === 'true',
        parentTop: t[10] === 'true',
        name: t[11],
        frame: +t[12],
        total: +t[13],
        isPlaying: t[14],
        children: +t[15],
        words: t.slice(16).map(Number),
      };
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
  assert.equal(
    original.sha256,
    'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153',
    'Not qualified original',
  );
  assert.deepEqual(emission.fields, fields, 'Changed fields');
  assert.equal(
    sha(await readFile(new URL('./effect-clock-probe.py', import.meta.url))),
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
  assert(zero >= 0, 'Missing glue name');
  assert.equal(sha(glue.slice(zero + 1)), emission.added_probe_abc_sha256, 'Changed glue bytes');
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
      renamed += b.filter(([id, name]) => id === 0 && name === 'BT3EffectClockProbe').length;
    } else assert.deepEqual(dest.raw, source.raw, 'Changed original tag bytes/header/order');
  }
  assert.equal(pi, probe.tags.length, 'Unexpected extra tags');
  assert.equal(added, 1);
  assert.equal(renamed, 1);
  assert.equal(original.tags.length, 3022);
  assert.equal(probe.tags.length, 3023);
  const sourceAudit = await audit(originalPath);
  assert.deepEqual(emission.audit, sourceAudit, 'Changed independently audited bindings/sources');
  const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
  const rawTrace = (await readFile(resolve(capture, 'trace.jsonl'), 'utf8'))
    .trimEnd()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(observed.trace, rawTrace, 'Collector differs from durable raw trace');
  assert.deepEqual(observed.errors, [], 'Page errors');
  assert(
    !observed.messages.some((m) =>
      /Error #|recursively acquire mutex|Maximum call stack/.test(m.text),
    ),
    'AVM/runtime error',
  );
  const discovery = JSON.parse(await readFile(resolve(capture, 'discovery.json'), 'utf8'));
  const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
  assert.equal(discovery.operation, 'list_browser_targets');
  assert.equal(scenario.operation, 'capture_browser_scenario');
  assert.equal(
    scenario.parameters.browser.target_id,
    discovery.normalized_result.targets[0].target_id,
  );
  const steps = scenario.normalized_result.steps;
  assert.deepEqual(
    steps.map((s) => s.step_id),
    ['scenario_start', 'load', 'ready', 'original-startup', 'focus', 'f8', 'done'],
  );
  assert(
    steps.every((s) => s.status === 'completed'),
    'Incomplete REA actions',
  );
  assert(
    !scenario.normalized_result.events.items.some(
      (e) => e.kind === 'page-error' || /Error #/.test(e.text ?? ''),
    ),
    'REA runtime error',
  );
  const dom = steps.at(-1).artifacts.dom.value;
  assert.equal(sha(dom.text), dom.sha256, 'Changed independent DOM digest');
  assert.equal(Buffer.byteLength(dom.text), dom.bytes);
  const retained = dom.text.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert(retained, 'Missing independent REA DOM');
  const independent = retained.split('\n').filter(Boolean);
  assert.equal(independent.length, 4096, 'Missing independent tail');
  assert.deepEqual(
    independent,
    rawTrace.slice(-4096),
    'Collector differs from independent DOM tail',
  );
  const lines = rawTrace.filter((s) => s.startsWith('BT3_EFFECT'));
  assert.equal(lines[0], 'BT3_EFFECT_BEGIN');
  assert.equal(lines.at(-1), 'BT3_EFFECT_DONE 243');
  const contract = pack(lines),
    samples = rows(contract),
    roots = samples.filter((r) => r.path === '0' && r.kind === 'tree');
  assert(
    samples.every(
      (r) =>
        r.words.length === 24 &&
        r.words.every((w) => Number.isInteger(w) && w >= 0 && w <= 0xffffffff) &&
        decode(r.words).every(Number.isFinite),
    ),
    'Invalid builtin binary Number words',
  );
  const rootKeys = [];
  for (let i = 0; i < 30; i++) {
    const source = sourceAudit.roots[i % 15],
      label = (i < 15 ? 'before:' : 'inside:') + source.key,
      birth = i < 15 ? 0 : 1;
    const group = roots.filter((r) => r.label === label);
    assert(
      group.every((r) => r.className === source.className && r.total === source.frames),
      'Wrong original root class/frames',
    );
    assert.equal(new Set(group.map((r) => r.id)).size, 1, 'Root identity reset');
    const expected = [
      `${birth}/constructor`,
      `${birth}/queued`,
      '7/pre-register',
      '7/post-register',
    ];
    const window = new Set([1, 2, 3, 7, 8, 9, 243]);
    for (const n of [
      source.frames,
      ...source.descendants.filter((d) => d.frames > 1).map((d) => d.frames),
    ])
      for (const cycle of [1, 2])
        for (const delta of [-1, 0, 1, 2]) {
          const tick = cycle * n + delta + (i >= 15 ? 1 : 0);
          if (tick >= 1 && tick <= 243) window.add(tick);
        }
    assert.deepEqual(
      emission.windows[i],
      [...window].sort((a, b) => a - b),
      'Changed declared boundary selection',
    );
    for (const tick of window)
      for (const phase of ['enter', 'exit']) expected.push(`${tick}/${phase}`);
    const callbacks = group.filter((r) => r.phase === 'callback');
    assert.equal(callbacks.length, 1, 'Wrong callback count');
    const cb = callbacks[0];
    assert.equal(cb.frame, source.frames, 'Poll not ready');
    assert(cb.parentTop && !cb.parentNull && cb.parentId === -1, 'Callback after detach');
    expected.push(`${cb.tick}/callback`);
    assert.deepEqual(
      group.map((r) => `${r.tick}/${r.phase}`).sort(),
      expected.sort(),
      'Missing/extra root phase',
    );
    const before = group.find((r) => r.phase === 'pre-register'),
      after = group.find((r) => r.phase === 'post-register');
    assert(before.parentNull && !before.parentTop, 'Queue unexpectedly attached');
    assert(after.parentTop && !after.parentNull, 'Wrong registered parent');
    assert.equal(after.id, before.id);
    assert.equal(after.frame, before.frame, 'Registration reset');
    assert.deepEqual(
      decode(after.words).slice(0, 2),
      [13 + i, 23 + i],
      'Wrong original CreateEffect writes',
    );
    const exit = group.find((r) => r.phase === 'exit' && r.tick === cb.tick);
    assert(exit.parentNull && !exit.parentTop, 'Not detached after callback');
    assert(
      group.find((r) => r.phase === 'exit' && r.tick === 243).parentNull,
      'Retained root not removed',
    );
    rootKeys.push([label, cb.tick, cb.frame, after.frame, group[0].id]);
  }
  const polls = lines.filter((s) => s.startsWith('BT3_EFFECT_POLL '));
  assert.deepEqual(
    polls.map((s) => s.split(' ').slice(0, 3).join(' ')),
    Array.from({ length: 237 }, (_, i) => [
      `BT3_EFFECT_POLL before ${i + 7}`,
      `BT3_EFFECT_POLL after ${i + 7}`,
    ]).flat(),
    'Missing original Run poll',
  );
  for (const root of roots.filter((r) => r.phase === 'callback')) {
    const b = lines.indexOf(
      `BT3_EFFECT_POLL before ${root.tick} ` +
        polls
          .find((s) => s.startsWith(`BT3_EFFECT_POLL before ${root.tick} `))
          .split(' ')
          .at(-1),
    );
    const action = lines.indexOf(`BT3_EFFECT_ACTION callback ${root.label} ${root.tick}`);
    const a = lines.indexOf(polls.find((s) => s.startsWith(`BT3_EFFECT_POLL after ${root.tick} `)));
    assert(b < action && action < a, 'Callback outside original poll');
  }
  // Instance names are raw evidence, while Dictionary IDs authenticate retained identity.
  const names = new Map();
  for (const line of lines.filter((s) => s.startsWith('BT3_EFFECT_BITS '))) {
    const t = line.split(' '),
      id = t[6],
      name = t[11];
    if (names.has(id) && names.get(id) !== name)
      assert(
        /^effect_\d+$/.test(name) && !/^effect_/.test(names.get(id)),
        'Unexpected name/identity reset',
      );
    names.set(id, name);
  }
  assert(
    observed.responses.some(
      (r) => r.url.endsWith('/research.swf') && r.status === 200 && r.sha256 === probe.sha256,
    ),
    'Wrong loaded probe',
  );
  assert.equal(observed.modules.modules.length, 3);
  for (const module of observed.modules.modules) {
    const matches = module.installedComparisons.filter(
      (f) => f.matchesObserved && f.sha256 === module.sha256 && f.bytes === module.bytes,
    );
    assert(matches.length, 'Missing loaded/installed module agreement');
    for (const entry of matches) {
      assert(/^[\w.-]+\.(js|wasm)$/.test(entry.name));
      const bytes = await readFile(resolve('node_modules/@ruffle-rs/ruffle', entry.name));
      assert.equal(sha(bytes), module.sha256, 'Forged runtime bytes');
      assert.equal(bytes.length, module.bytes);
    }
    if (module.language !== 'WebAssembly')
      assert(
        observed.responses.some(
          (r) => r.url === module.url && r.sha256 === module.sha256 && r.status === 200,
        ),
        'Missing module response',
      );
    else
      assert(
        observed.responses.some(
          (r) => r.url.endsWith('.wasm') && r.sha256 === module.sha256 && r.status === 200,
        ),
        'Missing loaded WASM response',
      );
  }
  assert.equal(observed.viewerModules.length, 1);
  const viewer = observed.viewerModules[0];
  assert(
    observed.responses.some(
      (r) =>
        r.url === viewer.url &&
        r.sha256 === viewer.sha256 &&
        r.bytes === viewer.bytes &&
        r.status === 200,
    ),
    'Wrong viewer response',
  );
  const fixture = {
    originalSha256: original.sha256,
    probeSha256: probe.sha256,
    emitterSha256: emission.emitter_sha256,
    addedGlueAbcSha256: emission.added_probe_abc_sha256,
    originalAbcPayloadHashes: originalAbc,
    sourceAudit,
    fields,
    runtimeModules: observed.modules.modules
      .map(({ sha256, bytes }) => ({ sha256, bytes }))
      .sort((a, b) => a.sha256.localeCompare(b.sha256)),
    viewer: { sha256: viewer.sha256, bytes: viewer.bytes },
    contract,
  };
  assert.equal(
    discovery.normalized_result.browser.product,
    'Chrome/' + observed.version,
    'Browser discovery/collector disagreement',
  );
  const sourcePath = resolve(capture, 'reemission-source.json'),
    repeatedPath = resolve(capture, 'repeated-probe.swf');
  await writeFile(sourcePath, JSON.stringify(sourceAudit));
  const repeated = spawnSync(
    'python3',
    ['tools/reference/effect-clock-probe.py', originalPath, repeatedPath, sourcePath],
    { encoding: 'utf8' },
  );
  assert.equal(repeated.status, 0, 'Repeat emission failed: ' + repeated.stderr);
  assert.equal(sha(await readFile(repeatedPath)), probe.sha256, 'Nondeterministic probe emission');
  const proof = {
    originalTags: original.tags.length,
    probeTags: probe.tags.length,
    allOriginalTagBytesHeadersOrderAndMovieHeaderPreserved: true,
    onlyCid0BindingChanged: true,
    deterministicReemission: true,
    rootCohorts: 30,
    roots: 15,
    binaryRows: samples.length,
    binaryNumbers: samples.length * 12,
    nullChildReads: lines.filter((s) => s.startsWith('BT3_EFFECT_NULL')).length,
    polls: 237,
    rootKeys,
    traceSha256: sha(lines.join('\n') + '\n'),
    independentDomTailLines: 4096,
    evidenceId: scenario.evidence_id,
    reaCompleteness: scenario.normalized_result.completeness,
    browser: discovery.normalized_result.browser,
  };
  await writeFile(
    resolve(capture, 'verified-effect-clock-preservation.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  return { fixture, proof };
}
