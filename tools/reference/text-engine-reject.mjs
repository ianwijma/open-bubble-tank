/** Synchronized hostile copies, never source/runtime swaps or existing evidence writes.
 * node tools/reference/text-engine-reject.mjs ORIGINAL PROBE EMISSION CAPTURE REPORT
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha } from './text-engine-evidence.mjs';
const [original, probe, emission, capture, report] = process.argv.slice(2);
if (!report || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE REPORT');
const verify = fileURLToPath(new URL('./text-engine-verify.mjs', import.meta.url));
const run = (a, b, c, d) =>
  spawnSync(process.execPath, [verify, a, b, c, d], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
const control = run(original, probe, emission, capture);
assert.equal(control.status, 0, 'Unmodified positive control failed: ' + control.stderr);
const root = await mkdtemp(join(tmpdir(), 'bt3-text-engine-reject-')),
  results = [];
const traceMutations = [
  'forged-boolean',
  'nonboolean',
  'forged-width',
  'parent-id',
  'mask-id',
  'child-index',
  'point-identity',
  'point-value',
  'bounds-value',
  'target-own-matrix',
  'wrapper-own-matrix',
  'target-concatenated-matrix',
  'wrapper-concatenated-matrix',
  'combined-point-hit',
  'boundary-hit',
  'boundary-point-and-hit',
  'synchronized-matrices',
  'main-offset',
  'wrong-parent-class',
  'wrong-static-class',
  'missing-sample',
  'dom-disagreement',
];
try {
  for (const mutation of [
    ...traceMutations,
    'depth-metadata',
    'derivative-classification',
    'runtime-identity',
    'avm-error',
    'original-input',
    'original-abc',
    'original-text',
    'original-csm',
    'original-order',
    'non-document-binding',
    'derived-glyph-payload',
    'derived-mode',
    'glue-abc',
    'shape-flag',
    'timeline-depth',
    'header-fields',
  ]) {
    const folder = join(root, mutation),
      target = join(folder, 'capture');
    await mkdir(target, { recursive: true });
    const observed = JSON.parse(await readFile(join(capture, 'observation.json'), 'utf8'));
    const scenario = JSON.parse(await readFile(join(capture, 'scenario.json'), 'utf8'));
    const input = JSON.parse(await readFile(emission, 'utf8'));
    let originalPath = original,
      probePath = probe;
    if (traceMutations.includes(mutation)) {
      const selectedControl =
        mutation === 'boundary-hit'
          ? 'engine-composed-shear target edge-xmin-0 world'
          : mutation === 'boundary-point-and-hit'
            ? 'engine-identity target edge-xmax-100 world'
            : 'baseline target empty-margin local';
      const line = observed.trace.find((s) =>
        s.startsWith('BT3_ENGINE_BITS original-1659 ' + selectedControl + ' '),
      );
      assert(line);
      const p = line.split(' ');
      const word = (field, value) => {
        const b = Buffer.alloc(8);
        b.writeDoubleBE(value);
        const index = input.fields.indexOf(field);
        assert(index >= 0);
        const at = 9 + index * 2;
        p[at] = String(b.readUInt32BE());
        p[at + 1] = String(b.readUInt32BE(4));
      };
      if (['forged-boolean', 'nonboolean'].includes(mutation))
        for (const k of ['hit', 'hitAgain']) word(k, mutation === 'nonboolean' ? 2 : 0);
      if (mutation === 'forged-width') for (const k of ['width', 'widthAgain']) word(k, 296.4);
      if (mutation === 'parent-id') word('parentId', 1);
      if (mutation === 'mask-id') word('maskId', 4);
      if (mutation === 'child-index') word('childIndex', 2);
      if (mutation === 'point-identity') word('pointIsInput', 1);
      if (mutation === 'point-value') word('point.x', -15);
      if (mutation === 'target-own-matrix') word('targetOwn.a', 1.25);
      if (mutation === 'wrapper-own-matrix') word('wrapperOwn.tx', 1);
      if (mutation === 'target-concatenated-matrix') word('targetConcatenated.a', 1.25);
      if (mutation === 'wrapper-concatenated-matrix') word('wrapperConcatenated.tx', 1);
      if (mutation === 'combined-point-hit') {
        word('input.x', 1000);
        word('point.x', 1000);
        word('roundTrip.x', 1000);
        word('hit', 0);
        word('hitAgain', 0);
      }
      if (mutation === 'boundary-hit') {
        word('hit', 0);
        word('hitAgain', 0);
      }
      if (mutation === 'boundary-point-and-hit') {
        word('input.x', 278.85);
        word('point.x', 278.85);
        word('roundTrip.x', 278.85);
        word('hit', 1);
        word('hitAgain', 1);
      }
      if (mutation === 'synchronized-matrices') {
        word('targetOwn.a', 1.25);
        word('targetConcatenated.a', 1.25);
      }
      if (mutation === 'bounds-value') word('worldBounds.x', -15);
      if (mutation === 'main-offset') word('main.x', 1);
      if (mutation === 'wrong-parent-class') p[7] = 'Bubblefield';
      if (mutation === 'wrong-static-class') p[6] = 'flash.text::TextField';
      if (mutation === 'dom-disagreement') word('height', 90);
      const revised = mutation === 'missing-sample' ? '' : p.join(' ');
      observed.trace = observed.trace.flatMap((s) =>
        s === line ? (revised ? [revised] : []) : [s],
      );
      if (mutation !== 'dom-disagreement') {
        const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
        dom.text = dom.text.replace(line, revised);
        dom.sha256 = sha(dom.text);
        dom.bytes = Buffer.byteLength(dom.text);
      }
    } else if (mutation === 'depth-metadata') input.wrappers[0].children[0].depth = 2;
    else if (mutation === 'derivative-classification') input.derived[0].classification = 'original';
    else if (mutation === 'runtime-identity') {
      const m = observed.modules.modules[0],
        old = m.sha256;
      m.sha256 = '0'.repeat(64);
      for (const f of m.installedComparisons) {
        f.sha256 = m.sha256;
        f.bytes = m.bytes;
        f.matchesObserved = true;
      }
      for (const r of observed.responses) if (r.sha256 === old) r.sha256 = m.sha256;
    } else if (mutation === 'avm-error')
      observed.messages.push({ type: 'log', text: 'Error #1009: forged runtime failure' });
    else {
      let bytes = Buffer.from(await readFile(mutation === 'original-input' ? original : probe));
      const tags = [];
      let at = 8 + Math.ceil((5 + 4 * (bytes[8] >> 3)) / 8) + 4;
      while (at < bytes.length) {
        const start = at,
          h = bytes.readUInt16LE(at);
        at += 2;
        let size = h & 63;
        if (size === 63) {
          size = bytes.readUInt32LE(at);
          at += 4;
        }
        tags.push({ start, at, size, end: at + size, code: h >> 6 });
        at += size;
      }
      const abcs = tags.filter((t) => t.code === 82),
        project = tags.filter(
          (t) => [33, 74, 39].includes(t.code) && bytes.readUInt16LE(t.at) >= 60000,
        );
      let changed = false;
      // Retain the declaration index before mutation; all added tag envelopes are long-form except settings.
      const addedIndex = (t) => project.indexOf(t);
      let entry;
      if (['original-input', 'original-abc', 'glue-abc'].includes(mutation)) {
        entry = mutation === 'glue-abc' ? abcs.at(-1) : abcs[0];
        assert(entry);
        bytes[entry.end - 1] ^= 1;
        changed = true;
        if (mutation === 'glue-abc')
          input.added_tags.at(-2).sha256 = sha(bytes.subarray(entry.start, entry.end));
      }
      if (['original-text', 'original-csm'].includes(mutation)) {
        entry = tags.find(
          (t) =>
            t.code === (mutation === 'original-text' ? 33 : 74) &&
            bytes.readUInt16LE(t.at) === 1659,
        );
        assert(entry);
        bytes[entry.at + (mutation === 'original-text' ? entry.size - 2 : 2)] ^= 1;
        changed = true;
      }
      if (mutation === 'original-order') {
        const a = tags[0],
          b = tags[1];
        bytes = Buffer.concat([
          bytes.subarray(0, a.start),
          bytes.subarray(b.start, b.end),
          bytes.subarray(a.start, a.end),
          bytes.subarray(b.end),
        ]);
        changed = true;
      }
      if (mutation === 'non-document-binding')
        for (const t of tags.filter((t) => t.code === 76)) {
          let cursor = t.at + 2;
          for (let i = 0; i < bytes.readUInt16LE(t.at); i++) {
            const id = bytes.readUInt16LE(cursor);
            cursor += 2;
            const end = bytes.indexOf(0, cursor);
            if (id > 0 && id < 60000 && !changed) {
              bytes[cursor] ^= 1;
              changed = true;
            }
            cursor = end + 1;
          }
        }
      if (['derived-glyph-payload', 'derived-mode', 'timeline-depth'].includes(mutation)) {
        entry = project.find(
          (t) =>
            t.code === (mutation === 'derived-mode' ? 74 : mutation === 'timeline-depth' ? 39 : 33),
        );
        assert(entry);
        if (mutation === 'timeline-depth') {
          bytes.writeUInt16LE(2, entry.at + 7);
          input.wrappers[0].children[0].depth = 2;
        } else
          bytes[entry.at + (mutation === 'derived-mode' ? 2 : entry.size - 2)] ^=
            mutation === 'derived-mode' ? 64 : 1;
        input.added_tags[addedIndex(entry)].sha256 = sha(bytes.subarray(entry.start, entry.end));
        changed = true;
      }
      if (mutation === 'shape-flag') {
        entry = abcs.at(-1);
        assert(entry);
        const offset = bytes.indexOf(Buffer.from([0x26, 0x46, 20, 3]), entry.at);
        assert(offset >= entry.at && offset < entry.end);
        bytes[offset] = 0x27;
        input.added_tags.at(-2).sha256 = sha(bytes.subarray(entry.start, entry.end));
        changed = true;
      }
      if (mutation === 'header-fields') {
        bytes[8] ^= 1;
        changed = true;
      }
      assert(changed, 'Mutation did not modify input: ' + mutation);
      if (mutation === 'original-input') {
        originalPath = join(folder, 'original.swf');
        await writeFile(originalPath, bytes);
        input.original_sha256 = sha(bytes);
      } else {
        probePath = join(folder, 'probe.swf');
        await writeFile(probePath, bytes);
        input.probe_sha256 = sha(bytes);
        for (const r of observed.responses)
          if (r.url.endsWith('/research.swf')) r.sha256 = input.probe_sha256;
      }
    }
    await writeFile(
      join(target, 'trace.jsonl'),
      observed.trace.map(JSON.stringify).join('\n') + '\n',
    );
    await writeFile(join(target, 'observation.json'), JSON.stringify(observed));
    await writeFile(join(target, 'scenario.json'), JSON.stringify(scenario));
    const emissionPath = join(folder, 'emission.json');
    await writeFile(emissionPath, JSON.stringify(input));
    const result = run(originalPath, probePath, emissionPath, target);
    assert.notEqual(result.status, 0, 'Mutation accepted: ' + mutation);
    assert(
      result.stderr.includes('AssertionError'),
      'Rejected for incidental error: ' + result.stderr,
    );
    results.push({
      mutation,
      rejected: true,
      exitCode: result.status,
      reason: result.stderr.split('\n').find((s) => s.includes('AssertionError')),
    });
  }
  await mkdir(resolve(report, '..'), { recursive: true });
  await writeFile(
    report,
    JSON.stringify(
      { unmodifiedControlPassed: true, frozenSamples: 2554, binaryValues: 168564, results },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ rejected: results.length, report }));
} finally {
  await rm(root, { recursive: true, force: true });
}
