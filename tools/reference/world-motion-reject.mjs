/** Adversarial fresh copies only; never edit source captures or frozen words.
 * node tools/reference/world-motion-reject.mjs ORIGINAL PROBE EMISSION CAPTURE REPORT
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, cp, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha } from './world-motion-evidence.mjs';
const [original, probe, emission, capture, report] = process.argv.slice(2);
if (!report || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE REPORT');
const root = await mkdtemp(join(tmpdir(), 'bt3-world-motion-reject-'));
const results = [];
try {
  for (const mutation of [
    'missing-sample',
    'missing-getter',
    'binary-word',
    'wrong-parent',
    'wrong-parent-identity',
    'signed-zero',
    'wrong-cohort',
    'runtime-identity',
    'original-abc',
    'non-document-binding',
    'glue-abc',
    'avm-error',
    'movie-header',
    'original-tag',
    'class-speed',
  ]) {
    const folder = join(root, mutation),
      target = join(folder, 'capture');
    await cp(resolve(capture), target, { recursive: true });
    const observed = JSON.parse(await readFile(join(target, 'observation.json'), 'utf8'));
    const scenario = JSON.parse(await readFile(join(target, 'scenario.json'), 'utf8'));
    const input = JSON.parse(await readFile(emission, 'utf8'));
    let probePath = probe;
    if (
      [
        'missing-sample',
        'missing-getter',
        'binary-word',
        'wrong-parent',
        'wrong-parent-identity',
        'signed-zero',
        'wrong-cohort',
        'class-speed',
      ].includes(mutation)
    ) {
      const line = observed.trace.find((s) => s.startsWith('BT3_MOTION_BITS both 40 avatar '));
      assert(line);
      const parts = line.split(' ');
      let revised;
      if (mutation === 'missing-sample') revised = '';
      if (mutation === 'missing-getter') revised = parts.slice(0, -2).join(' ');
      if (mutation === 'binary-word') {
        parts[8] = String((Number(parts[8]) ^ 1) >>> 0);
        revised = parts.join(' ');
      }
      if (mutation === 'wrong-parent-identity') {
        parts[6] = 'false';
        revised = parts.join(' ');
      }
      if (mutation === 'signed-zero') {
        assert.equal(parts[23], '0'); // own.c high word: positive zero
        assert.equal(parts[24], '0');
        parts[23] = '2147483648';
        revised = parts.join(' ');
      }
      if (mutation === 'wrong-parent') {
        parts[5] = 'Bubblefield';
        revised = parts.join(' ');
      }
      if (mutation === 'class-speed') {
        parts[67] = '1073741824';
        revised = parts.join(' ');
      }
      if (mutation === 'wrong-cohort') {
        parts[2] = '52';
        revised = parts.join(' ');
      }
      observed.trace = observed.trace.flatMap((s) =>
        s === line ? (revised ? [revised] : []) : [s],
      );
      const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
      dom.text = dom.text.replace(line, revised);
      dom.bytes = Buffer.byteLength(dom.text);
      dom.sha256 = sha(dom.text);
      await writeFile(
        join(target, 'trace.jsonl'),
        observed.trace.map(JSON.stringify).join('\n') + '\n',
      );
    } else if (mutation === 'runtime-identity') {
      const module = observed.modules.modules[0];
      module.sha256 = '0'.repeat(64);
      for (const comparison of module.installedComparisons) {
        comparison.sha256 = module.sha256;
        comparison.bytes = module.bytes;
        comparison.matchesObserved = true;
      }
    } else if (mutation === 'avm-error') {
      observed.messages.push({ type: 'log', text: 'Error #1009: rejected getter/capture' });
    } else {
      const bytes = Buffer.from(await readFile(probe));
      assert.equal(bytes.toString('ascii', 0, 3), 'FWS');
      let at = 8 + Math.ceil((5 + 4 * (bytes[8] >> 3)) / 8) + 4,
        changed = false;
      const abcs = [];
      if (mutation === 'movie-header') {
        bytes[at - 4] ^= 1;
        changed = true;
      }
      while (at < bytes.length) {
        const header = bytes.readUInt16LE(at);
        at += 2;
        const code = header >> 6;
        let size = header & 63;
        if (size === 63) {
          size = bytes.readUInt32LE(at);
          at += 4;
        }
        if (code === 82) abcs.push({ at, size });
        if (mutation === 'original-tag' && !changed && ![72, 82, 76].includes(code) && size > 0) {
          bytes[at] ^= 1;
          changed = true;
        }
        if (code === 76 && mutation === 'non-document-binding') {
          let cursor = at + 2;
          for (let i = 0; i < bytes.readUInt16LE(at); i++) {
            const id = bytes.readUInt16LE(cursor);
            cursor += 2;
            const end = bytes.indexOf(0, cursor);
            if (id !== 0 && !changed) {
              bytes[cursor] ^= 1;
              changed = true;
            }
            cursor = end + 1;
          }
        }
        at += size;
      }
      if (mutation === 'original-abc' || mutation === 'glue-abc') {
        const entry = mutation === 'original-abc' ? abcs[0] : abcs.at(-1);
        assert(entry);
        bytes[entry.at + entry.size - 1] ^= 1;
        changed = true;
      }
      assert(changed);
      probePath = join(folder, 'changed.swf');
      await writeFile(probePath, bytes);
      // Consistent metadata/response forgery must still fail preservation/frozen identity.
      input.probe_sha256 = sha(bytes);
      for (const response of observed.responses)
        if (response.url.endsWith('/research.swf')) response.sha256 = input.probe_sha256;
    }
    await writeFile(join(target, 'observation.json'), JSON.stringify(observed));
    await writeFile(join(target, 'scenario.json'), JSON.stringify(scenario));
    const emissionPath = join(folder, 'emission.json');
    await writeFile(emissionPath, JSON.stringify(input));
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./world-motion-verify.mjs', import.meta.url)),
        original,
        probePath,
        emissionPath,
        target,
      ],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 },
    );
    assert.notEqual(result.status, 0, `Mutation accepted: ${mutation}`);
    results.push({
      mutation,
      rejected: true,
      exitCode: result.status,
      reason:
        result.stderr.split('\n').find((s) => s.includes('AssertionError')) ??
        result.stderr.slice(0, 180),
    });
  }
  await mkdir(resolve(report, '..'), { recursive: true });
  await writeFile(
    report,
    JSON.stringify({ frozenSamples: 400, binaryValues: 12400, results }, null, 2) + '\n',
  );
  console.log(JSON.stringify({ rejected: results.length, report }));
} finally {
  await rm(root, { recursive: true, force: true });
}
