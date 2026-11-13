/** Consistent forgeries change observer/raw/independent-DOM views together.
 * Every mutation is a fresh owned copy; original captures and frozen words stay read-only.
 * node tools/reference/actor-clock-reject.mjs ORIGINAL PROBE EMISSION CAPTURE
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha } from './actor-clock-evidence.mjs';
import { readHeader, iterTags } from '../../src/game/assets/swf.mjs';
const [original, probe, emission, capture, fixture] = process.argv.slice(2);
if (!fixture) throw new Error('Supply ORIGINAL PROBE EMISSION OWNED_CAPTURE FIXTURE');
const root = resolve(capture, 'rejecting-controls');
await mkdir(root); // fresh only, never merge into another run
const results = [];
for (const mutation of [
  'birth-hold',
  'ancestor-freeze',
  'removed-freeze',
  'restore-reset',
  'mount-descendant-freeze',
  'stopped-root-play',
  'root-identity',
  'descendant-pose',
  'ancestor-is-direct-removal',
  'direct-removal-is-parented',
  'invented-playing',
  'missing-reentrant-exit',
  'missing-sample',
  'runtime-wasm',
  'independent-dom',
  'original-abc',
  'original-tag',
  'movie-header',
  'non-document-binding',
  'glue-abc',
]) {
  const folder = join(root, mutation),
    target = join(folder, 'capture');
  await mkdir(folder);
  await mkdir(target);
  for (const name of ['observation.json', 'scenario.json', 'discovery.json', 'trace.jsonl'])
    await cp(resolve(capture, name), join(target, name));
  const observed = JSON.parse(await readFile(join(target, 'observation.json'), 'utf8'));
  const scenario = JSON.parse(await readFile(join(target, 'scenario.json'), 'utf8'));
  const input = JSON.parse(await readFile(emission, 'utf8'));
  let probePath = probe,
    changes = 0;
  const dom = scenario.normalized_result.steps.at(-1).artifacts.dom.value;
  const rewrite = (fn) => {
    observed.trace = observed.trace.flatMap((line) => {
      const revised = fn(line);
      if (revised === line) return [line];
      changes++;
      return revised === null ? [] : [revised];
    });
    dom.text = dom.text.replace(
      /(<pre[^>]*id="trace"[^>]*>)[\s\S]*?(<\/pre>)/,
      (_, a, b) => a + observed.trace.slice(-4096).join('\n') + b,
    );
    dom.bytes = Buffer.byteLength(dom.text);
    dom.sha256 = sha(dom.text);
  };
  const rotor = observed.trace
    .map((s) => s.split(' '))
    .find(
      (t) =>
        t[0] === 'BT3_ACTOR_CLOCK_BITS' && t[3] === 'inside:mount-control' && t[11] === 'rotor',
    )[6];
  if (
    [
      'birth-hold',
      'ancestor-freeze',
      'removed-freeze',
      'restore-reset',
      'mount-descendant-freeze',
      'stopped-root-play',
      'root-identity',
      'descendant-pose',
      'ancestor-is-direct-removal',
      'direct-removal-is-parented',
      'invented-playing',
      'missing-reentrant-exit',
      'missing-sample',
    ].includes(mutation)
  ) {
    let removedExit = false;
    rewrite((line) => {
      const t = line.split(' ');
      if (t[0] !== 'BT3_ACTOR_CLOCK_BITS') return line;
      const root = t[4] === '0' && t[5] === 'tree';
      if (
        mutation === 'birth-hold' &&
        t[3] === 'inside:mount-control' &&
        t[1] === '2' &&
        t[2] === 'enter' &&
        t[11] === 'wiggle-negative'
      )
        t[12] = '2';
      else if (
        mutation === 'ancestor-freeze' &&
        t[3] === 'before:controlled' &&
        t[1] === '150' &&
        t[11] === 'wiggle-negative'
      )
        t[12] = '13';
      else if (
        mutation === 'removed-freeze' &&
        t[3] === 'before:controlled' &&
        t[1] === '400' &&
        t[11] === 'wiggle-negative'
      )
        t[12] = '37';
      else if (
        mutation === 'restore-reset' &&
        t[3] === 'before:npc' &&
        t[2] === 'post-restore-original' &&
        !root &&
        +t[13] > 1
      )
        t[12] = '1';
      else if (
        mutation === 'mount-descendant-freeze' &&
        t[3] === 'inside:mount-control' &&
        t[1] === '150' &&
        t[8] === rotor &&
        t[5] === 'retained'
      )
        t[12] = '1';
      else if (mutation === 'stopped-root-play' && t[11] === 'rotor' && t[1] === '400') t[12] = '2';
      else if (
        mutation === 'root-identity' &&
        t[3] === 'before:npc' &&
        t[2] === 'post-restore-original' &&
        root
      )
        t[6] = '999999';
      else if (
        mutation === 'descendant-pose' &&
        t[3] === 'inside:mount-control' &&
        t[1] === '550' &&
        t[8] === rotor
      )
        t[17] = String((+t[17] ^ 1) >>> 0);
      else if (
        mutation === 'ancestor-is-direct-removal' &&
        t[3] === 'before:npc' &&
        t[2] === 'post-ancestor-glue' &&
        root
      ) {
        t[8] = '0';
        t[9] = 'true';
      } else if (
        mutation === 'direct-removal-is-parented' &&
        t[3] === 'before:npc' &&
        t[2] === 'post-remove-glue' &&
        root
      ) {
        t[8] = '-1';
        t[9] = 'false';
      } else if (mutation === 'invented-playing' && t[11] === 'rotor' && t[1] === '1')
        t[14] = 'true';
      else if (
        mutation === 'missing-reentrant-exit' &&
        !removedExit &&
        t[1] === '1' &&
        t[2] === 'exit' &&
        root
      ) {
        removedExit = true;
        return null;
      } else if (
        mutation === 'missing-sample' &&
        t[3] === 'before:npc' &&
        t[1] === '3' &&
        t[2] === 'enter' &&
        root
      )
        return null;
      else return line;
      return t.join(' ');
    });
  } else if (mutation === 'runtime-wasm') {
    const m = observed.modules.modules.find((m) => m.language === 'WebAssembly');
    assert(m);
    m.sha256 = '0'.repeat(64);
    for (const c of m.installedComparisons) {
      c.sha256 = m.sha256;
      c.matchesObserved = true;
    }
    changes++;
  } else if (mutation === 'independent-dom') {
    dom.text = dom.text.replace('BT3_ACTOR_CLOCK_DONE 550', 'BT3_ACTOR_CLOCK_DONE 549');
    dom.bytes = Buffer.byteLength(dom.text);
    dom.sha256 = sha(dom.text);
    changes++;
  } else {
    const bytes = await readFile(probe);
    const header = readHeader(bytes);
    const tags = [...iterTags(bytes, header.tagsOffset)];
    let offset = header.tagsOffset;
    const locations = tags.map((t) => {
      const p = offset;
      offset += 2 + (t.len >= 63 ? 4 : 0) + t.len;
      return { ...t, offset: p + 2 + (t.len >= 63 ? 4 : 0) };
    });
    if (mutation === 'movie-header') bytes[17] ^= 1;
    if (mutation === 'original-abc') {
      const t = locations.find((t) => t.code === 82);
      bytes[t.offset + t.len - 10] ^= 1;
    }
    if (mutation === 'original-tag') {
      const t = locations.find((t) => [2, 22, 32, 83].includes(t.code));
      bytes[t.offset + t.len - 1] ^= 1;
    }
    if (mutation === 'non-document-binding') {
      const t = locations.find(
        (t) => t.code === 76 && Buffer.from(t.body).includes(Buffer.from('_-MQ\0')),
      );
      const part = Buffer.from(t.body);
      const pos = part.indexOf(Buffer.from('_-MQ\0'));
      assert(pos > 0);
      bytes[t.offset + pos + 3] = 'y'.charCodeAt(0);
    }
    if (mutation === 'glue-abc') {
      const t = locations.filter((t) => t.code === 82).at(-1);
      bytes[t.offset + t.len - 4] ^= 1;
      const glue = bytes.subarray(t.offset, t.offset + t.len);
      input.added_probe_abc_sha256 = sha(glue.subarray(glue.indexOf(0, 4) + 1));
    }
    probePath = join(folder, 'probe.swf');
    await writeFile(probePath, bytes);
    input.probe_sha256 = sha(bytes);
    changes++;
  }
  assert(changes > 0, `Mutation did not change data: ${mutation}`);
  await writeFile(
    join(target, 'trace.jsonl'),
    observed.trace.map(JSON.stringify).join('\n') + '\n',
  );
  await writeFile(join(target, 'observation.json'), JSON.stringify(observed));
  await writeFile(join(target, 'scenario.json'), JSON.stringify(scenario));
  const emissionPath = join(folder, 'emission.json');
  await writeFile(emissionPath, JSON.stringify(input));
  const result = spawnSync(
    process.execPath,
    ['tools/reference/actor-clock-verify.mjs', original, probePath, emissionPath, target, fixture],
    { encoding: 'utf8', maxBuffer: 2000000 },
  );
  assert.notEqual(result.status, 0, `Forgery accepted: ${mutation}`);
  assert.equal(result.signal, null, `Verifier crashed: ${mutation}`);
  const message = result.stderr.trim();
  assert(
    message && !/SyntaxError|ENOENT|out of memory/.test(message),
    `Unexpected rejection: ${message}`,
  );
  results.push({ mutation, changes, rejected: true, reason: message.slice(0, 600) });
  await rm(folder, { recursive: true });
}
await writeFile(join(root, 'results.json'), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ rejected: results.length, report: join(root, 'results.json') }));
