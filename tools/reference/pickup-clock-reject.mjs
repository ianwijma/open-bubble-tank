/** Adversarial caller-owned copies. Semantic controls update the expected raw
 * trace digest so a hash check cannot conceal a missing mechanism assertion. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decompressSWF, readHeader, iterTags } from '../../src/game/assets/swf.mjs';
const [original, probe, capture, variant] = process.argv.slice(2),
  inside = variant === '--inside-enter';
if (!resolve(capture).startsWith(resolve('reference-captures') + sep))
  throw new Error('Caller-owned capture required.');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const results = [];
async function prepare(name) {
  const out = resolve(capture, 'rejecting-controls', name);
  await mkdir(out, { recursive: true });
  for (const f of [
    'observation.json',
    'trace.jsonl',
    'source-identities.json',
    'rea-evidence.json',
  ])
    await copyFile(resolve(capture, f), resolve(out, f));
  return out;
}
const run = (name, out, candidate, expected, fixture) => {
  const result = spawnSync(
    process.execPath,
    [
      resolve('tools/reference/pickup-clock-verify.mjs'),
      original,
      candidate,
      out,
      ...(inside ? [variant] : []),
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, ...(fixture ? { BT3_PICKUP_VERIFY_FIXTURE: fixture } : {}) },
    },
  );
  if (!result.status || !result.stderr.includes(expected))
    throw new Error(`${name}: unexpected result ${result.stderr}`);
  results.push({ name, exitCode: result.status, rejection: expected });
};
const controls = [
  [
    'frozen-parentless-frame',
    (w) => {
      w[5] = '1';
    },
    (w) => w[1] === 'enter' && w[2] === 'held50' && w[3] === '15',
    'ENTER advancement differs',
  ],
  [
    'uid-global-frame-guess',
    (w) => {
      w[5] = '19';
    },
    (w) => w[1] === 'enter' && w[2] === 'parent50' && w[3] === '15',
    'ENTER advancement differs',
  ],
  [
    'removed-clock-frozen',
    (w) => {
      w[5] = '20';
    },
    (w) => w[1] === 'enter' && w[2] === 'removed50' && w[3] === '50',
    'ENTER advancement differs',
  ],
  [
    'wrong-physical-parent',
    (w) => {
      w[7] = 'false';
      w[8] = 'true';
    },
    (w) => w[1] === 'removed' && w[2] === 'removed1',
    'Parent retention mismatch',
  ],
  [
    'setup-reparents',
    (w) => {
      w[7] = 'false';
      w[8] = 'true';
    },
    (w) => w[1] === 'setup' && w[2] === 'held1',
    'Parent retention mismatch',
  ],
  [
    'spawn-denomination',
    (w) => {
      w[14] = '50';
    },
    (w) => w[1] === 'spawned' && w[2] === 'spawn5',
    'Setup/spawn writes mismatch',
  ],
  [
    'root-class-substitution',
    (w) => {
      w[4] = '_-5A';
    },
    (w) => w[1] === 'enter' && w[2] === 'held1' && w[3] === '15',
    'Class/count/identity mismatch',
  ],
  [
    'root-identity-substitution',
    (w) => {
      w[10] = 'instance999999';
    },
    (w) => w[1] === 'enter' && w[2] === 'held1' && w[3] === '15',
    'Class/count/identity mismatch',
  ],
  [
    'child-static-pose',
    (w) => {
      w[7] = '1';
    },
    (w) => w[0] === 'BT3_PICKUP_CHILD' && w[1] === 'enter' && w[2] === 'held50' && w[3] === '15',
    'Child pose differs',
  ],
  [
    'child-identity-reset',
    (w) => {
      w[4] = 'instance999999';
    },
    (w) => w[0] === 'BT3_PICKUP_CHILD' && w[1] === 'enter' && w[2] === 'held50' && w[3] === '15',
    'Child identity reset',
  ],
  [
    'nested-frame-reconstruction',
    (w) => {
      w[9] = '2';
    },
    (w) => w[0] === 'BT3_PICKUP_CHILD' && w[1] === 'enter' && w[2] === 'held50' && w[3] === '15',
    'Nested1819 frame differs',
  ],
];
for (const [name, mutate, choose, expected] of controls) {
  const out = await prepare(name),
    o = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
  let changes = 0;
  o.trace = o.trace.map((line) => {
    const w = line.split(' ');
    if (
      choose(w) &&
      w[0] ===
        (name.startsWith('child-') || name.startsWith('nested-')
          ? 'BT3_PICKUP_CHILD'
          : 'BT3_PICKUP_SAMPLE')
    ) {
      mutate(w);
      changes++;
      return w.join(' ');
    }
    return line;
  });
  if (changes !== 1) throw new Error(`Control must change exactly one row: ${name}/${changes}`);
  await writeFile(resolve(out, 'observation.json'), JSON.stringify(o));
  await writeFile(resolve(out, 'trace.jsonl'), o.trace.map(JSON.stringify).join('\n') + '\n');
  const fixture = JSON.parse(await readFile('tests/fixtures/pickup-clock-original.json', 'utf8'));
  fixture[inside ? 'inside' : 'before'].traceSha256 = sha(
    o.trace.slice(o.trace.indexOf('BT3_PICKUP_BEGIN')).join('\n'),
  );
  const fixturePath = resolve(out, 'control-fixture.json');
  await writeFile(fixturePath, JSON.stringify(fixture));
  run(name, out, probe, expected, fixturePath);
}
for (const name of ['loaded-wasm-identity', 'independent-dom-disagrees', 'missing-sample']) {
  const out = await prepare(name),
    o = JSON.parse(await readFile(resolve(out, 'observation.json'), 'utf8'));
  if (name === 'loaded-wasm-identity')
    o.modules.modules.find((m) => m.language === 'WebAssembly').sha256 = '0'.repeat(64);
  else if (name === 'independent-dom-disagrees') {
    const rea = JSON.parse(await readFile(resolve(out, 'rea-evidence.json'), 'utf8')),
      dom = rea.scenario.normalized_result.steps.at(-1).artifacts.dom.value;
    dom.text = dom.text.replace('BT3_PICKUP_DONE 180', 'BT3_PICKUP_DONE 179');
    dom.sha256 = sha(dom.text);
    await writeFile(resolve(out, 'rea-evidence.json'), JSON.stringify(rea));
  } else
    o.trace.splice(
      o.trace.findIndex((l) => l.startsWith('BT3_PICKUP_SAMPLE enter held1 3 ')),
      1,
    );
  await writeFile(resolve(out, 'observation.json'), JSON.stringify(o));
  await writeFile(resolve(out, 'trace.jsonl'), o.trace.map(JSON.stringify).join('\n') + '\n');
  run(
    name,
    out,
    probe,
    {
      'loaded-wasm-identity': 'Loaded modules differ.',
      'independent-dom-disagrees': 'Independent REA DOM tail differs.',
      'missing-sample': 'Exact raw trace differs.',
    }[name],
  );
}
for (const [name, code, expected] of [
  ['original-abc-modified', 82, 'Original ABC changed or reordered'],
  ['nonbinding-payload-modified', 9, 'Original nonbinding payload changed'],
  ['pickup-binding-modified', 76, 'Non-document binding changed'],
]) {
  const out = await prepare(name),
    { bytes } = await decompressSWF(new Uint8Array(await readFile(probe))),
    tags = [...iterTags(bytes, readHeader(bytes).tagsOffset)];
  const t = tags.find(
    (t) => t.code === code && (code !== 76 || Buffer.from(t.body).includes(Buffer.from('_-Bd\0'))),
  );
  if (code === 76) t.body[Buffer.from(t.body).indexOf(Buffer.from('_-Bd\0')) + 3] ^= 1;
  else t.body[t.body.length - 1] ^= 1;
  const candidate = resolve(out, 'mutated.swf');
  await writeFile(candidate, bytes);
  run(name, out, candidate, expected);
}
await writeFile(
  resolve(capture, 'rejecting-controls.json'),
  JSON.stringify(results, null, 2) + '\n',
);
console.log(`${results.length} rejecting controls passed.`);
