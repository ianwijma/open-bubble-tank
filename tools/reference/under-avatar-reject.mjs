/** Reject consistent edited captures as well as missing controls/payload changes.
 * node tools/reference/under-avatar-reject.mjs ORIGINAL PROBE EMISSION CAPTURE REPORT.json
 * All mutation writes go to fresh temporary directories, never source captures.
 */
import { readFile, writeFile, mkdtemp, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const [original, probe, emission, capture, report] = process.argv.slice(2);
if (!report || process.argv.length !== 7)
  throw new Error('Supply ORIGINAL PROBE EMISSION CAPTURE REPORT.json.');
const root = await mkdtemp(join(tmpdir(), 'bt3-under-reject-'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const results = [];
for (const mutation of ['missing-phase', 'binary-word', 'runtime-identity', 'original-abc']) {
  const folder = join(root, mutation),
    target = join(folder, 'capture');
  await cp(resolve(capture), target, { recursive: true });
  const observed = JSON.parse(await readFile(join(target, 'observation.json'), 'utf8'));
  const scenario = JSON.parse(await readFile(join(target, 'scenario.json'), 'utf8'));
  let probePath = probe;
  if (mutation === 'missing-phase' || mutation === 'binary-word') {
    const line = observed.trace.find((line) => line.startsWith('BT3_UNDER_BITS 2 height '));
    assert(line);
    let revised;
    if (mutation === 'binary-word') {
      const words = line.split(' ');
      words[10] = String((Number(words[10]) ^ 1) >>> 0);
      revised = line.replace(line, words.join(' '));
      observed.trace = observed.trace.map((value) => (value === line ? revised : value));
    } else {
      observed.trace = observed.trace.filter((value) => value !== line);
      revised = '';
    }
    const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
    dom.text = dom.text.replace(line, revised);
    dom.bytes = Buffer.byteLength(dom.text);
    dom.sha256 = sha(dom.text);
  } else if (mutation === 'runtime-identity') {
    const module = observed.modules.modules[0];
    module.sha256 = '0'.repeat(64);
    for (const comparison of module.installedComparisons) {
      comparison.sha256 = module.sha256;
      comparison.matchesObserved = true;
    }
  } else {
    const bytes = Buffer.from(await readFile(probe));
    assert.equal(bytes.toString('ascii', 0, 3), 'FWS');
    let at = 8 + Math.ceil((5 + 4 * (bytes[8] >> 3)) / 8) + 4;
    let changed = false;
    while (at < bytes.length) {
      const header = bytes.readUInt16LE(at);
      at += 2;
      const code = header >> 6;
      let size = header & 63;
      if (size === 63) {
        size = bytes.readUInt32LE(at);
        at += 4;
      }
      if (code === 82) {
        bytes[at + size - 1] ^= 1;
        changed = true;
        break;
      }
      at += size;
    }
    assert(changed);
    probePath = join(folder, 'changed-probe.swf');
    await writeFile(probePath, bytes);
  }
  await writeFile(join(target, 'observation.json'), JSON.stringify(observed));
  await writeFile(join(target, 'scenario.json'), JSON.stringify(scenario));
  const run = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./under-avatar-verify.mjs', import.meta.url)),
      original,
      probePath,
      emission,
      target,
    ],
    { encoding: 'utf8' },
  );
  assert.notEqual(run.status, 0, `Mutation accepted: ${mutation}`);
  await writeFile(join(folder, 'stderr.txt'), run.stderr);
  results.push({
    mutation,
    rejected: true,
    exitCode: run.status,
    stderr: join(folder, 'stderr.txt'),
  });
}
await writeFile(report, `${JSON.stringify({ temporaryRoot: root, results }, null, 2)}\n`);
console.log(JSON.stringify({ rejected: results.length, report }));
