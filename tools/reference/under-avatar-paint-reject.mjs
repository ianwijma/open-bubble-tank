/** Reject forged controls on fresh caller-owned copies, never original captures. */
import assert from 'node:assert/strict';
import { readFile, writeFile, cp, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha } from './under-avatar-paint-evidence.mjs';
const [original, probe, emission, capture, report] = process.argv.slice(2);
if (!report) throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE REPORT');
const root = await mkdtemp(join(tmpdir(), 'bt3-under-paint-reject-')),
  results = [];
try {
  for (const mutation of [
    'missing-row',
    'consistent-pixel',
    'orientation',
    'runtime',
    'original-abc',
    'binding',
    'glue',
    'avm-error',
  ]) {
    const target = join(root, mutation);
    await cp(capture, target, { recursive: true });
    const observed = JSON.parse(await readFile(join(target, 'observation.json'), 'utf8'));
    const scenario = JSON.parse(await readFile(join(target, 'scenario.json'), 'utf8'));
    const input = JSON.parse(await readFile(emission, 'utf8'));
    let changedProbe = probe;
    if (['missing-row', 'consistent-pixel', 'orientation'].includes(mutation)) {
      const line = observed.trace.find((s) => s.startsWith('BT3_PAINT_CASE 6 ')),
        parts = line.split(' ');
      let replacement = '';
      if (mutation === 'consistent-pixel') {
        parts[6] = String((Number(parts[6]) ^ 1) >>> 0);
        replacement = parts.join(' ');
      }
      if (mutation === 'orientation') {
        parts[4] = '180';
        replacement = parts.join(' ');
      }
      observed.trace = observed.trace.flatMap((s) =>
        s === line ? (replacement ? [replacement] : []) : [s],
      );
      const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
      dom.text = dom.text.replace(line, replacement);
      dom.sha256 = sha(dom.text);
      dom.bytes = Buffer.byteLength(dom.text);
      await writeFile(
        join(target, 'trace.jsonl'),
        observed.trace.map(JSON.stringify).join('\n') + '\n',
      );
    } else if (mutation === 'runtime') {
      const module = observed.modules.modules[0];
      module.sha256 = '0'.repeat(64);
      for (const m of module.installedComparisons) {
        m.sha256 = module.sha256;
        m.matchesObserved = true;
      }
    } else if (mutation === 'avm-error')
      observed.messages.push({ type: 'error', text: 'Error #1009' });
    else {
      const bytes = await readFile(probe);
      const needle =
        mutation === 'binding'
          ? Buffer.from('Bubblefield\0')
          : mutation === 'glue'
            ? Buffer.from('BT3_PAINT_CASE')
            : Buffer.from('BTAGameWorld');
      const at = bytes.indexOf(needle);
      assert(at > 0);
      bytes[at] ^= 1;
      changedProbe = join(target, 'changed.swf');
      await writeFile(changedProbe, bytes);
      input.probe_sha256 = sha(bytes);
      for (const r of observed.responses.filter((r) => r.url.endsWith('/research.swf')))
        r.sha256 = input.probe_sha256;
    }
    await writeFile(join(target, 'observation.json'), JSON.stringify(observed));
    await writeFile(join(target, 'scenario.json'), JSON.stringify(scenario));
    const changedEmission = join(target, 'emission.json');
    await writeFile(changedEmission, JSON.stringify(input));
    const result = spawnSync(
      'node',
      [
        'tools/reference/under-avatar-paint-verify.mjs',
        original,
        changedProbe,
        changedEmission,
        target,
      ],
      { encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0, 'Accepted ' + mutation);
    results.push({ mutation, rejected: true, diagnostic: result.stderr.slice(0, 1000) });
  }
  await writeFile(report, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results.map(({ mutation, rejected }) => ({ mutation, rejected }))));
} finally {
  await rm(root, { recursive: true, force: true });
}
