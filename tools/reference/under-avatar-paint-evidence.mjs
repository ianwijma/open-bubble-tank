/** Independent source/payload/trace/DOM checks; no candidate renderer imports.
 * Writes only derived proof in caller-owned CAPTURE; never use old evidence inputs.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { decompressSWF, iterTags, readHeader, u16 } from '../../src/game/assets/swf.mjs';
export const sha = (b) => createHash('sha256').update(b).digest('hex');
async function parse(path) {
  const raw = await readFile(path),
    { bytes } = await decompressSWF(new Uint8Array(raw));
  const header = readHeader(bytes);
  let at = header.tagsOffset;
  const tags = [...iterTags(bytes, at)].map((tag) => {
    const start = at;
    at += 2 + ((u16(bytes, at) & 63) === 63 ? 4 : 0) + tag.len;
    return { ...tag, raw: bytes.slice(start, at) };
  });
  return {
    raw,
    tags,
    version: bytes[3],
    header: sha(bytes.slice(8, header.tagsOffset)),
    trailer: sha(bytes.slice(at)),
  };
}
function bindings(data) {
  let at = 2;
  const result = [];
  for (let i = 0; i < u16(data, 0); i++) {
    const id = u16(data, at);
    at += 2;
    const end = data.indexOf(0, at);
    assert(end >= at);
    result.push([id, new TextDecoder().decode(data.slice(at, end))]);
    at = end + 1;
  }
  assert.equal(at, data.length);
  return result;
}
export async function captureEvidence(originalPath, probePath, emissionPath, capture) {
  const original = await parse(originalPath),
    probe = await parse(probePath);
  const emission = JSON.parse(await readFile(emissionPath, 'utf8'));
  assert.equal(
    sha(original.raw),
    'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153',
    'Wrong supplied original',
  );
  assert.equal(sha(original.raw), emission.original_sha256);
  assert.equal(sha(probe.raw), emission.probe_sha256);
  assert.equal(probe.version, original.version);
  assert.equal(probe.header, original.header, 'Changed movie header');
  assert.equal(probe.trailer, original.trailer);
  assert.equal(probe.tags.length, original.tags.length + 1);
  let pi = 0,
    added = 0,
    renamed = 0;
  for (const source of original.tags) {
    let dest = probe.tags[pi++];
    if (dest.code === 82 && source.code !== 82) {
      assert.equal(
        new TextDecoder().decode(dest.body.slice(4, dest.body.indexOf(0, 4))),
        'under-avatar-paint-probe',
      );
      added++;
      dest = probe.tags[pi++];
    }
    assert.equal(dest.code, source.code, 'Changed original tag order');
    if (source.code === 76) {
      const a = bindings(source.body),
        b = bindings(dest.body);
      assert.deepEqual(
        b.map(([id, name]) => [id, id === 0 ? 'Main' : name]),
        a,
        'Changed non-document binding',
      );
      renamed += b.filter(([id, name]) => id === 0 && name === 'BT3UnderAvatarPaintProbe').length;
    } else assert.deepEqual(dest.raw, source.raw, 'Changed original tag/header/payload');
  }
  assert.equal(pi, probe.tags.length);
  assert.equal(added, 1);
  assert.equal(renamed, 1);
  const abc = (tags) => tags.filter((t) => t.code === 72 || t.code === 82).map((t) => sha(t.body));
  assert.deepEqual(abc(probe.tags).slice(0, -1), abc(original.tags));
  assert.deepEqual(abc(original.tags), emission.preserved_original_abc_tag_payloads);
  // Re-emission proves the added glue matches the reviewed emitter, not just caller metadata.
  assert.equal(
    sha(await readFile('tools/reference/under-avatar-paint-probe.py')),
    emission.emitter_sha256,
  );
  const temp = await mkdtemp(join(tmpdir(), 'bt3-under-paint-'));
  try {
    const emitted = spawnSync(
      'python3',
      ['tools/reference/under-avatar-paint-probe.py', originalPath, join(temp, 'probe.swf')],
      { encoding: 'utf8' },
    );
    assert.equal(emitted.status, 0, emitted.stderr);
    assert.deepEqual(await readFile(join(temp, 'probe.swf')), probe.raw, 'Unexpected glue bytes');
    assert.deepEqual(JSON.parse(emitted.stdout), emission, 'Changed design/emission');
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  for (const [path, hash] of Object.entries(emission.source_sha256)) {
    assert(/^export_pcode\/scripts\/[\w-]+\.pcode$/.test(path));
    assert.equal(
      sha(await readFile(resolve(dirname(originalPath), path))),
      hash,
      'Changed qualified source',
    );
  }
  const observed = JSON.parse(await readFile(resolve(capture, 'observation.json'), 'utf8'));
  const trace = (await readFile(resolve(capture, 'trace.jsonl'), 'utf8'))
    .trimEnd()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(observed.trace, trace, 'Collector differs from durable trace');
  assert.deepEqual(observed.errors, []);
  assert(
    !observed.messages.some((m) =>
      /Error #|Maximum call stack|recursively acquire mutex/.test(m.text),
    ),
    'AVM/capture error',
  );
  const scenario = JSON.parse(await readFile(resolve(capture, 'scenario.json'), 'utf8'));
  assert.equal(scenario.operation, 'capture_browser_scenario');
  assert(
    scenario.normalized_result.steps.every((s) => s.status === 'completed'),
    'Incomplete REA actions',
  );
  assert(
    !scenario.normalized_result.events.items.some(
      (e) => e.kind === 'page-error' || /Error #/.test(e.text ?? ''),
    ),
  );
  const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
  assert.equal(sha(dom.text), dom.sha256);
  assert.equal(Buffer.byteLength(dom.text), dom.bytes);
  const retained = dom.text.match(/<pre[^>]*id="trace"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert(retained);
  const paint = (lines) => lines.filter((line) => line.startsWith('BT3_PAINT_'));
  const lines = paint(trace);
  assert.deepEqual(paint(retained.split('\n')), lines, 'Independent REA DOM differs');
  assert.equal(lines.length, emission.cases.length + 2);
  assert.equal(
    lines[0],
    'BT3_PAINT_BEGIN Bubblefield flash.display::MovieClip flash.display::MovieClip true true 4 3 8',
  );
  assert.equal(lines.at(-1), 'BT3_PAINT_DONE');
  const samples = emission.cases.map((control, i) => {
    const [marker, ...words] = lines[i + 1].split(' ');
    assert.equal(marker, 'BT3_PAINT_CASE');
    assert(words.every((w) => /^-?\d+$/.test(w)));
    const [id, x, y, rotation, ...pixels] = words.map(Number);
    assert.deepEqual(
      [id, x, y, rotation],
      [i, control.x, control.y, control.rotation],
      'Changed cohort',
    );
    assert.equal(pixels.length, emission.points.length);
    assert(pixels.every((p) => p >= 0 && p <= 0xffffffff));
    return { ...control, pixels };
  });
  assert(
    observed.responses.some(
      (r) => r.url.endsWith('/research.swf') && r.status === 200 && r.sha256 === sha(probe.raw),
    ),
    'Loaded probe identity missing',
  );
  assert.equal(observed.modules.modules.length, 3);
  for (const module of observed.modules.modules) {
    const matches = module.installedComparisons.filter(
      (m) => m.matchesObserved && m.sha256 === module.sha256 && m.bytes === module.bytes,
    );
    assert(matches.length, 'Loaded module mismatch');
    for (const match of matches) {
      assert(/^[\w.-]+\.(js|wasm)$/.test(match.name));
      const bytes = await readFile(resolve('node_modules/@ruffle-rs/ruffle', match.name));
      assert.equal(sha(bytes), module.sha256, 'Forged runtime identity');
      assert.equal(bytes.length, module.bytes);
    }
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
  );
  const fixture = {
    originalSha256: sha(original.raw),
    probeSha256: sha(probe.raw),
    emitterSha256: emission.emitter_sha256,
    sourceHashes: emission.source_sha256,
    originalAbcPayloadHashes: abc(original.tags),
    points: emission.points,
    runtimeModules: observed.modules.modules
      .map(({ sha256, bytes }) => ({ sha256, bytes }))
      .sort((a, b) => a.sha256.localeCompare(b.sha256)),
    viewer: { sha256: viewer.sha256, bytes: viewer.bytes },
    samples,
    scope: emission.scope,
  };
  const proof = {
    evidenceId: scenario.evidence_id,
    originalTags: original.tags.length,
    probeTags: probe.tags.length,
    preservedTagsHeaderOrderAbcsAndNonDocumentBindings: true,
    reemissionIdentical: true,
    independentDomAndDurableTraceAgree: true,
    samples: samples.length,
    pixels: samples.length * emission.points.length,
    reaCompleteness: scenario.normalized_result.completeness,
    limitations: scenario.limitations,
    fixture,
  };
  await writeFile(
    resolve(capture, 'verified-under-avatar-paint-preservation.json'),
    JSON.stringify(proof, null, 2) + '\n',
  );
  return { fixture, proof };
}
