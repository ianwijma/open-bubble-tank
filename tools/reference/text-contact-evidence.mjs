/** Independent original preservation, wrapper placement, numeric trace/REA DOM and loaded-byte checks.
 * No production traversal, renderer or simulation imports. Derived proof writes only in CAPTURE.
 */
import assert from 'node:assert/strict';
import { inspectTextContactAbc } from './text-contact-abc.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { decompressSWF, readHeader, iterTags, u16, BitReader } from '../../src/game/assets/swf.mjs';
export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const decode = (words) =>
  words.map(([high, low]) => {
    const b = Buffer.alloc(8);
    b.writeUInt32BE(high);
    b.writeUInt32BE(low, 4);
    return b.readDoubleBE();
  });
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
// This parser never calls the Python emitter. It reads the actual added timelines.
function wrapperInventory(t, binding) {
  assert.equal(t.code, 39);
  assert.equal(u16(t.body, 2), 1, 'Project wrappers must have one frame');
  const children = [];
  const tags = [...iterTags(t.body, 4)];
  assert.deepEqual(
    tags.slice(-2).map((t) => t.code),
    [1, 0],
    'Wrapper frame/end',
  );
  for (const p of tags.slice(0, -2)) {
    assert.equal(p.code, 26, 'Unexpected wrapper action or drawing');
    const bytes = p.body,
      flags = bytes[0];
    assert([38, 102].includes(flags), 'Unexpected project placement flags');
    const symbol = u16(bytes, 3),
      depth = u16(bytes, 1),
      r = new BitReader(bytes, 5);
    assert.equal(r.readUB(1), 0, 'Unexpected wrapper scale');
    assert.equal(r.readUB(1), 0, 'Unexpected wrapper rotate');
    const n = r.readUB(5),
      tx = r.readSB(n),
      ty = r.readSB(n);
    r.align();
    const at = r.pos / 8,
      end = bytes.indexOf(0, at);
    assert(end >= at);
    const name = new TextDecoder().decode(bytes.slice(at, end));
    assert.equal(ty, 0);
    assert.equal(tx % 20, 0);
    const clipDepth = flags & 64 ? u16(bytes, end + 1) : null;
    assert.equal(end + 1 + (flags & 64 ? 2 : 0), bytes.length, 'Extra wrapper placement bytes');
    children.push({ symbol, depth, name, x: tx / 20, clipDepth });
  }
  return { id: u16(t.body, 0), class: binding, children };
}
export async function captureEvidence(originalPath, probePath, emissionPath, capture) {
  const original = await parse(originalPath),
    probe = await parse(probePath);
  const emission = JSON.parse(await readFile(emissionPath, 'utf8'));
  assert.equal(original.sha256, emission.original_sha256, 'Changed original input');
  assert.equal(probe.sha256, emission.probe_sha256, 'Changed probe identity');
  assert.equal(original.version, probe.version, 'Changed original version');
  assert.equal(original.header, probe.header, 'Changed original header fields');
  assert.equal(original.trailer, probe.trailer, 'Changed original trailer');
  assert.equal(original.tags.length, 3022, 'Unexpected original tag count');
  // Separate added project tags by exact original-sequence alignment at the document binding.
  const additions = [];
  let pi = 0,
    renamed = 0;
  for (const source of original.tags) {
    if (source.code === 76 && bindings(source.body).some(([id]) => id === 0)) {
      while (
        [33, 74, 39].includes(probe.tags[pi]?.code) ||
        probe.tags[pi]?.code === 82 ||
        (probe.tags[pi]?.code === 76 && !bindings(probe.tags[pi].body).some(([id]) => id === 0))
      )
        additions.push(probe.tags[pi++]);
      const dest = probe.tags[pi++];
      assert.equal(dest?.code, 76, 'Missing document binding');
      const b = bindings(dest.body);
      assert.deepEqual(
        b.map(([id, name]) => [id, id === 0 ? 'Main' : name]),
        bindings(source.body),
        'Changed original non-document binding',
      );
      assert.equal(b.find(([id]) => id === 0)?.[1], 'BT3TextContactProbe');
      renamed++;
    } else {
      assert.deepEqual(probe.tags[pi++]?.raw, source.raw, 'Changed original payload/header/order');
    }
  }
  assert.equal(pi, probe.tags.length, 'Unexpected extra tag');
  assert.equal(renamed, 1);
  const originalAbc = original.tags
    .filter((t) => [72, 82].includes(t.code))
    .map((t) => sha(t.body));
  assert.deepEqual(
    originalAbc,
    emission.preserved_original_abc_tag_payloads,
    'Changed original ABC declarations',
  );
  assert.deepEqual(
    additions.map((t) => ({ code: t.code, sha256: sha(t.raw) })),
    emission.added_tags,
    'Changed declared added tags',
  );
  assert.deepEqual(
    additions.map((t) => t.code),
    [33, 74, 33, 74, ...Array(10).fill(39), 82, 76],
    'Unexpected project tag kinds/count',
  );
  const glueInspection = inspectTextContactAbc(
    additions.at(-2).body,
    emission.cohort.length,
    emission.fields.length,
  );
  const newBindings = bindings(additions.at(-1).body);
  const inventory = additions
    .slice(4, -2)
    .map((t) => wrapperInventory(t, newBindings.find(([id]) => id === u16(t.body, 0))?.[1]));
  assert.deepEqual(
    inventory,
    emission.wrappers.map(({ label, ...w }) => w),
    'Changed authored depths/mask metadata',
  );
  assert.deepEqual(
    newBindings,
    inventory.map((w) => [w.id, w.class]),
    'Unexpected project bindings',
  );
  // Only the new IDs differ in the derived text body; original font/glyph/matrix bytes remain literal.
  const sourceText = original.tags.find((t) => t.code === 33 && u16(t.body, 0) === 1659);
  assert(sourceText, 'Missing original static text');
  const derived = additions.slice(0, 4);
  for (let i = 0; i < 2; i++) {
    const text = derived[i * 2],
      settings = derived[i * 2 + 1],
      id = 61000 + i;
    assert.equal(u16(text.body, 0), id, 'Unexpected derived CID');
    assert.deepEqual(
      text.body.slice(2),
      sourceText.body.slice(2),
      'Changed derived font/glyph/matrix payload',
    );
    assert.equal(settings.body.length, 12);
    assert.equal(u16(settings.body, 0), id);
    assert.equal(settings.body[2], (i << 6) | (2 << 3), 'Changed declared derived rendering mode');
    assert.deepEqual(
      [...settings.body.slice(3)],
      Array(9).fill(0),
      'Changed derived CSM floats/reserved',
    );
  }
  assert.deepEqual(
    emission.derived,
    [0, 1].map((renderer) => ({
      id: 61000 + renderer,
      source: 1659,
      classification: 'PROJECT-owned derived DefineText2; only CID differs',
      renderer,
      gridFit: 2,
      thickness: 0,
      sharpness: 0,
    })),
    'Changed derivative classification',
  );
  const originalSettings = original.tags.filter((t) => t.code === 74);
  assert.equal(originalSettings.length, 422);
  const originalTextInventory = Array.from({ length: 8 }, (_, i) => {
    const id = 1659 + i,
      text = original.tags.find((t) => t.code === 33 && u16(t.body, 0) === id);
    const settings = originalSettings.filter((t) => u16(t.body, 0) === id);
    assert(text);
    assert.equal(settings.length, 1);
    assert.deepEqual(
      [...settings[0].body.slice(2)],
      [80, ...Array(9).fill(0)],
      'Changed original renderer1/grid2/zero CSM',
    );
    const reader = new BitReader(text.body, 2),
      n = reader.readUB(5);
    return {
      id,
      tag: 33,
      payloadSha256: sha(text.body),
      settingsPayloadSha256: sha(settings[0].body),
      boundsTwips: [reader.readSB(n), reader.readSB(n), reader.readSB(n), reader.readSB(n)],
    };
  });
  const emitterSha256 = sha(await readFile(new URL('./text-contact-probe.py', import.meta.url)));
  assert.equal(emitterSha256, emission.emitter_sha256, 'Changed emitter source');
  const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
  assert.equal(observed.endpoint, 'http://127.0.0.1:9995', 'Wrong owned CDP endpoint');
  assert.equal(observed.origin, 'http://127.0.0.1:3995', 'Wrong owned viewer');
  const raw = (await readFile(resolve(capture, 'trace.jsonl'), 'utf8'))
    .trimEnd()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(observed.trace, raw, 'Collector differs from durable raw trace');
  assert.deepEqual(observed.errors, [], 'Page error');
  assert(
    !observed.messages.some((m) =>
      /Error #|recursively acquire mutex|Maximum call stack/.test(m.text),
    ),
    'AVM runtime error',
  );
  const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
  assert.equal(scenario.operation, 'capture_browser_scenario', 'Not independent REA evidence');
  assert(
    scenario.normalized_result.steps.every((s) => s.status === 'completed'),
    'Incomplete REA actions',
  );
  assert(
    !scenario.normalized_result.events.items.some(
      (e) => e.kind === 'page-error' || /Error #/.test(e.text ?? ''),
    ),
    'Independent REA runtime error',
  );
  const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
  assert.equal(sha(dom.text), dom.sha256, 'Changed REA DOM digest');
  assert.equal(Buffer.byteLength(dom.text), dom.bytes, 'Changed DOM byte count');
  const retained = dom.text.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert(retained, 'Missing REA DOM trace');
  const select = (lines) => lines.filter((s) => s.startsWith('BT3_TEXT'));
  const lines = select(observed.trace);
  assert.deepEqual(select(retained.split('\n')), lines, 'Trace differs from independent REA DOM');
  assert.equal(lines[0], 'BT3_TEXT_BEGIN 550 450');
  assert.equal(lines.at(-1), 'BT3_TEXT_DONE');
  assert.equal(lines.length, emission.cohort.length + 2, 'Changed control row count');
  const fields = emission.fields;
  const samples = emission.cohort.map((c, i) => {
    const [
      marker,
      caseName,
      phase,
      role,
      point,
      space,
      className,
      parentClass,
      pointClass,
      ...raw
    ] = lines[i + 1].split(' ');
    assert.equal(marker, 'BT3_TEXT_BITS');
    assert.deepEqual({ case: caseName, phase, role, point, space }, c, 'Changed control order');
    assert.equal(pointClass, 'flash.geom::Point', 'Wrong actual Point class');
    assert.equal(raw.length, fields.length * 2, 'Missing getter');
    assert(
      raw.every((w) => /^(0|[1-9]\d*)$/.test(w) && Number(w) <= 0xffffffff),
      'Invalid uint binary word',
    );
    const words = Array.from({ length: fields.length }, (_, i) =>
      raw.slice(i * 2, i * 2 + 2).map(Number),
    );
    const values = Object.fromEntries(fields.map((key, i) => [key, decode(words)[i]]));
    assert(Object.values(values).every(Number.isFinite), 'Nonfinite getter');
    for (const key of ['hit', 'hitAgain', 'visible', 'pointIsInput', 'roundTripIsInput'])
      assert([0, 1].includes(values[key]), 'Nonboolean result');
    assert.equal(values.hit, values.hitAgain, 'Impure repeated hit');
    assert.equal(values.width, values.widthAgain, 'Impure repeated width');
    assert.equal(values.height, values.heightAgain, 'Impure repeated height');
    assert.equal(
      className,
      role === 'target'
        ? 'flash.text::StaticText'
        : role === 'wrapper'
          ? emission.wrappers.find((w) => w.label === caseName)?.class
          : 'flash.display::MovieClip',
      'Wrong actual builtin receiver class',
    );
    assert.equal(values['main.x'], 0);
    assert.equal(values['main.y'], 0);
    assert.equal(values['main.scaleX'], 1);
    assert.equal(values['main.scaleY'], 1);
    assert.equal(values['main.rotation'], 0);
    return { ...c, className, parentClass, pointClass, words };
  });
  assert(
    observed.responses.some(
      (r) => r.url.endsWith('/research.swf') && r.status === 200 && r.sha256 === probe.sha256,
    ),
    'Loaded probe bytes absent',
  );
  assert.equal(observed.modules.modules.length, 3, 'Missing loaded modules');
  for (const m of observed.modules.modules) {
    assert(
      observed.responses.some(
        (r) => r.status === 200 && r.sha256 === m.sha256 && r.bytes === m.bytes,
      ),
      'Loaded/response runtime mismatch',
    );
    const matches = m.installedComparisons.filter(
      (f) => f.matchesObserved && f.sha256 === m.sha256 && f.bytes === m.bytes,
    );
    assert(matches.length, 'Loaded/installed mismatch');
    for (const f of matches) {
      assert(/^[\w.-]+\.(js|wasm)$/.test(f.name));
      const b = await readFile(resolve('node_modules/@ruffle-rs/ruffle', f.name));
      assert.equal(sha(b), m.sha256, 'Forged runtime identity');
      assert.equal(b.length, m.bytes);
    }
  }
  assert.equal(observed.viewerModules.length, 1, 'Missing actual viewer');
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
  // Deduplicate exact binary64 pairs to keep the bounded cohort reviewable.
  // Indices refer to raw observed words, never decimal-derived expectations.
  const binaryWords = [];
  const compactSamples = samples.map(({ words, ...sample }) => ({
    ...sample,
    wordIndices: words.map((pair) => {
      let index = binaryWords.findIndex((p) => p[0] === pair[0] && p[1] === pair[1]);
      if (index < 0) {
        index = binaryWords.length;
        binaryWords.push(pair);
      }
      return index;
    }),
  }));
  const fixture = {
    scope: emission.scope,
    originalSha256: original.sha256,
    probeSha256: probe.sha256,
    emitterSha256,
    fields,
    wrappers: emission.wrappers,
    derived: emission.derived,
    originalTextInventory,
    addedTags: emission.added_tags,
    originalAbcPayloadHashes: originalAbc,
    runtimeModules: observed.modules.modules
      .map(({ sha256, bytes }) => ({ sha256, bytes }))
      .sort((a, b) => a.sha256.localeCompare(b.sha256)),
    viewer: { sha256: viewer.sha256, bytes: viewer.bytes },
    binaryWords,
    samples: compactSamples,
  };
  const proof = {
    originalTextInventory,
    declaredDerivedText: emission.derived,
    originalTagCount: original.tags.length,
    probeTagCount: probe.tags.length,
    allOriginalPayloadsTagHeadersOrderAndAbcsPreserved: true,
    onlyOriginalDocumentBindingChanged: true,
    addedProjectTags: emission.added_tags,
    independentlyParsedWrappers: inventory,
    independentlyDecodedAddedGlue: glueInspection,
    rawTraceAndIndependentReaDomAgree: true,
    binarySamples: samples.length,
    binaryValues: samples.length * fields.length,
    evidenceId: scenario.evidence_id,
    reaCompleteness: scenario.normalized_result.completeness,
    browser: observed.version,
    originalSha256: original.sha256,
    probeSha256: probe.sha256,
    runtimeModules: fixture.runtimeModules,
    scope: fixture.scope,
  };
  await writeFile(
    resolve(capture, 'verified-text-contact-preservation.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  return { fixture, proof };
}
