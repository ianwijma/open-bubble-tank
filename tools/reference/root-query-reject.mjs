/** Hostile evidence copies: synchronize forged trace/DOM/raw and still reject.
 * No production/source/installed runtime files are changed. Temporary copies are removed.
 * node tools/reference/root-query-reject.mjs ORIGINAL PROBE EMISSION CAPTURE REPORT
 */
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha } from './root-query-evidence.mjs';
const [original, probe, emission, capture, report] = process.argv.slice(2);
if (!report || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE REPORT');
const verify = fileURLToPath(new URL('./root-query-verify.mjs', import.meta.url));
const run = (a, b, c, d) =>
  spawnSync(process.execPath, [verify, a, b, c, d], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
const control = run(original, probe, emission, capture);
assert.equal(control.status, 0, 'Unmodified positive control failed: ' + control.stderr);
const root = await mkdtemp(join(tmpdir(), 'bt3-root-query-reject-')),
  results = [];
try {
  for (const mutation of [
    'forged-boolean',
    'nonboolean',
    'forged-number',
    'forged-point',
    'forged-boolean-and-point',
    'parent-id',
    'root-id',
    'loader-id',
    'root-mapping',
    'wrong-parent-class',
    'missing-sample',
    'depth-metadata',
    'cohort',
    'runtime-identity',
    'dom-disagreement',
    'original-input',
    'original-abc',
    'non-document-binding',
    'glue-abc',
    'shape-flag',
    'timeline-depth',
    'header-fields',
    'avm-error',
  ]) {
    const folder = join(root, mutation),
      target = join(folder, 'capture');
    await cp(resolve(capture), target, { recursive: true });
    const observed = JSON.parse(await readFile(join(target, 'observation.json'), 'utf8'));
    const scenario = JSON.parse(await readFile(join(target, 'scenario.json'), 'utf8'));
    const input = JSON.parse(await readFile(emission, 'utf8'));
    let originalPath = original,
      probePath = probe;
    if (
      [
        'forged-boolean',
        'nonboolean',
        'forged-number',
        'forged-point',
        'forged-boolean-and-point',
        'parent-id',
        'root-id',
        'loader-id',
        'root-mapping',
        'wrong-parent-class',
        'missing-sample',
        'dom-disagreement',
      ].includes(mutation)
    ) {
      const line = observed.trace.find((s) =>
        s.startsWith('BT3_ROOT_QUERY_BITS main1000 centre target '),
      );
      assert(line);
      const p = line.split(' ');
      const word = (field, value) => {
        const b = Buffer.alloc(8);
        b.writeDoubleBE(value);
        const at = 7 + input.fields.indexOf(field) * 2;
        assert(at >= 7);
        p[at] = String(b.readUInt32BE());
        p[at + 1] = String(b.readUInt32BE(4));
      };
      if (mutation === 'forged-boolean' || mutation === 'nonboolean')
        for (const k of ['stageHit', 'stageHitAgain']) word(k, mutation === 'nonboolean' ? 2 : 1);
      if (mutation === 'forged-number') word('width', 102);
      if (mutation === 'forged-point') word('stagePoint.x', 0);
      if (mutation === 'forged-boolean-and-point') {
        word('stagePoint.x', 0);
        word('stagePoint.y', 0);
        word('stageMappedStage.x', 1000);
        word('stageMappedLocal.x', 0);
        word('stageHit', 1);
        word('stageHitAgain', 1);
      }
      if (mutation === 'parent-id') word('parentId', 6);
      if (mutation === 'root-id') word('rootId', 4);
      if (mutation === 'loader-id') word('rootLoaderId', 1);
      if (mutation === 'root-mapping') word('mainOwn.tx', 0);
      if (mutation === 'wrong-parent-class') p[5] = 'Bubblefield';
      if (mutation === 'dom-disagreement') word('height', 102);
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
      await writeFile(
        join(target, 'trace.jsonl'),
        observed.trace.map(JSON.stringify).join('\n') + '\n',
      );
    } else if (mutation === 'depth-metadata') input.wrappers[0].children[0].depth = 6;
    else if (mutation === 'cohort') input.cohort[0].case = 'main1000';
    else if (mutation === 'runtime-identity') {
      const m = observed.modules.modules[0];
      m.sha256 = '0'.repeat(64);
      for (const f of m.installedComparisons) {
        f.sha256 = m.sha256;
        f.bytes = m.bytes;
        f.matchesObserved = true;
      }
    } else if (mutation === 'avm-error')
      observed.messages.push({ type: 'log', text: 'Error #1009: forged runtime failure' });
    else {
      const bytes = Buffer.from(await readFile(mutation === 'original-input' ? original : probe));
      // The supplied uncompressed original uses a historical CWS marker around an already
      // expanded body. Preserve that quirk and mutate actual original payload bytes.
      let at = 8 + Math.ceil((5 + 4 * (bytes[8] >> 3)) / 8) + 4,
        changed = false;
      const abcs = [];
      let projectIndex = 0;
      while (at < bytes.length) {
        const h = bytes.readUInt16LE(at);
        at += 2;
        const code = h >> 6;
        let size = h & 63;
        if (size === 63) {
          size = bytes.readUInt32LE(at);
          at += 4;
        }
        if (code === 82) abcs.push({ at, size });
        if (code === 76 && mutation === 'non-document-binding') {
          let cursor = at + 2;
          for (let i = 0; i < bytes.readUInt16LE(at); i++) {
            const id = bytes.readUInt16LE(cursor);
            cursor += 2;
            const end = bytes.indexOf(0, cursor);
            if (id !== 0 && id < 60000 && !changed) {
              bytes[cursor] ^= 1;
              changed = true;
            }
            cursor = end + 1;
          }
        }
        if (
          code === 39 &&
          bytes.readUInt16LE(at) >= 60000 &&
          mutation === 'timeline-depth' &&
          !changed
        ) {
          // Sprite header4 + PlaceObject2 header2 + flags1: actual depth word.
          bytes.writeUInt16LE(2, at + 7);
          changed = true;
          const rawStart = at - (h & 63 ? ((h & 63) === 63 ? 6 : 2) : 2);
          input.added_tags[projectIndex].sha256 = sha(bytes.subarray(rawStart, at + size));
          input.wrappers[projectIndex].children[0].depth = 2;
        }
        if (code === 39 && bytes.readUInt16LE(at) >= 60000) projectIndex++;
        at += size;
      }
      if (mutation === 'shape-flag') {
        const entry = abcs.at(-1);
        assert(entry);
        // pushtrue; callproperty hitTestPoint(QName22), argc3 in this pinned glue.
        const offset = bytes.indexOf(Buffer.from([0x26, 0x46, 22, 3]), entry.at);
        assert(offset >= entry.at && offset < entry.at + entry.size);
        bytes[offset] = 0x27;
        changed = true;
        input.added_tags.at(-2).sha256 = sha(bytes.subarray(entry.at - 6, entry.at + entry.size));
      }
      if (['original-input', 'original-abc', 'glue-abc'].includes(mutation)) {
        const entry = mutation === 'glue-abc' ? abcs.at(-1) : abcs[0];
        assert(entry);
        bytes[entry.at + entry.size - 1] ^= 1;
        changed = true;
        if (mutation === 'glue-abc') {
          const header = bytes.readUInt16LE(entry.at - 6);
          assert.equal(header >> 6, 82);
          input.added_tags.at(-2).sha256 = sha(bytes.subarray(entry.at - 6, entry.at + entry.size));
        }
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
      { unmodifiedControlPassed: true, frozenSamples: 36, binaryValues: 2592, results },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify({ rejected: results.length, report }));
} finally {
  await rm(root, { recursive: true, force: true });
}
