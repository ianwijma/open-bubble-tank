/** Reject adversarial copies without writing to the original or research tree.
 * node tools/reference/carrier-clock-reject.mjs ORIGINAL PROBE CAPTURE_DIR
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decompressSWF, readHeader, iterTags } from '../../src/game/assets/swf.mjs';
const [original, probe, capture, variant] = process.argv.slice(2);
const insideEnter = variant === '--inside-enter';
if (!capture) throw new Error('Supply ORIGINAL PROBE CAPTURE_DIR.');
const captureRoot = fileURLToPath(new URL('../../reference-captures/', import.meta.url));
if (!resolve(capture).startsWith(resolve(captureRoot) + sep))
  throw new Error('Mutation outputs must stay in this checkout’s reference-captures directory.');
const mutations = [
  [
    'parentless-clock-frozen',
    (o) =>
      o.trace.map((l) =>
        l.replace(
          insideEnter ? 'enter heldYE 3 _-YE 2 ' : 'enter heldYE 2 _-YE 2 ',
          insideEnter ? 'enter heldYE 3 _-YE 1 ' : 'enter heldYE 2 _-YE 1 ',
        ),
      ),
    'Clock/reset mismatch',
  ],
  [
    'registration-reset',
    (o) =>
      o.trace.map((l) =>
        l.replace(
          `post-register queueYE 32 _-YE ${insideEnter ? 6 : 7} `,
          'post-register queueYE 32 _-YE 1 ',
        ),
      ),
    'Clock/reset mismatch',
  ],
  [
    'wrong-parent-identity',
    (o) =>
      o.trace.map((l) =>
        l.replace(
          `post-register queue5z 32 _-5z ${insideEnter ? 5 : 6} 26 false true`,
          `post-register queue5z 32 _-5z ${insideEnter ? 5 : 6} 26 false false`,
        ),
      ),
    'Parent identity mismatch',
  ],
  [
    'missing-enter-boundary',
    (o) => o.trace.filter((l) => !l.startsWith('BT3_CARRIER_SAMPLE enter held5z 3 ')),
    'Missing or extra samples',
  ],
  [
    'callback-after-detach',
    (o) =>
      o.trace.map((l) =>
        l.replace(
          `BT3_CARRIER_CALLBACK YE ${insideEnter ? 51 : 50} 25 true`,
          `BT3_CARRIER_CALLBACK YE ${insideEnter ? 51 : 50} 25 false`,
        ),
      ),
    'Reentrant EXIT/callback/poll boundary changed',
  ],
  [
    'callback-born-consumed-early',
    (o) =>
      o.trace.map((l) =>
        l.replace(
          `BT3_CARRIER_POLL first after ${insideEnter ? 51 : 50} 1 1`,
          `BT3_CARRIER_POLL first after ${insideEnter ? 51 : 50} 0 1`,
        ),
      ),
    'Reentrant EXIT/callback/poll boundary changed',
  ],
];
if (insideEnter) {
  for (const phase of ['exit queueYE 1', 'enter heldYE 2'])
    mutations.push([
      `early-advance-${phase.replaceAll(' ', '-')}`,
      (o) => o.trace.map((l) => l.replace(`${phase} _-YE 1 `, `${phase} _-YE 2 `)),
      'Clock/reset mismatch',
    ]);
}
const results = [];
const run = (name, path, candidate, expected) => {
  const result = spawnSync(
    process.execPath,
    [
      resolve('tools/reference/carrier-clock-verify.mjs'),
      original,
      candidate,
      path,
      ...(insideEnter ? [variant] : []),
    ],
    { encoding: 'utf8' },
  );
  if (!result.status || !result.stderr.includes(expected))
    throw new Error(`${name}: unexpected result: ${result.stderr}`);
  results.push({ name, exitCode: result.status, rejection: expected });
};
const prepare = async (name) => {
  const path = resolve(capture, 'rejecting-controls', name);
  await mkdir(path, { recursive: true });
  for (const file of [
    'observation.json',
    'trace.jsonl',
    'source-identities.json',
    'rea-evidence.json',
  ])
    await copyFile(resolve(capture, file), resolve(path, file));
  return path;
};
for (const [name, mutate, expected] of mutations) {
  const path = await prepare(name),
    o = JSON.parse(await readFile(resolve(path, 'observation.json'), 'utf8'));
  o.trace = mutate(o);
  await writeFile(resolve(path, 'observation.json'), JSON.stringify(o));
  await writeFile(resolve(path, 'trace.jsonl'), o.trace.map(JSON.stringify).join('\n') + '\n');
  run(name, path, probe, expected);
}
{
  const name = 'loaded-wasm-identity',
    path = await prepare(name),
    o = JSON.parse(await readFile(resolve(path, 'observation.json'), 'utf8'));
  o.modules.modules.find((m) => m.language === 'WebAssembly').sha256 = '0'.repeat(64);
  await writeFile(resolve(path, 'observation.json'), JSON.stringify(o));
  run(name, path, probe, 'Loaded runtime module identity mismatch');
}
{
  const name = 'independent-dom-disagrees',
    path = await prepare(name),
    e = JSON.parse(await readFile(resolve(path, 'rea-evidence.json'), 'utf8'));
  const dom = e.scenario.normalized_result.steps.at(-1).artifacts.dom.value;
  dom.text = dom.text.replace(
    `exit parent5z 61 _-5z ${insideEnter ? 8 : 9}`,
    'exit parent5z 61 _-5z 7',
  );
  dom.sha256 = createHash('sha256').update(dom.text).digest('hex');
  await writeFile(resolve(path, 'rea-evidence.json'), JSON.stringify(e));
  run(name, path, probe, 'Canonical trace differs from independent REA DOM tail');
}
for (const [name, choose, expected] of [
  [
    'original-abc-modified',
    (tags) => tags.find((t) => t.code === 82),
    'Original ABC changed or reordered',
  ],
  [
    'nonbinding-payload-modified',
    (tags) => tags.find((t) => t.code === 9),
    'Original nonbinding payload changed',
  ],
  [
    'carrier-symbol-binding-modified',
    (tags) =>
      tags.find((t) => t.code === 76 && Buffer.from(t.body).includes(Buffer.from('_-YE\0'))),
    'Non-document binding changed',
  ],
]) {
  const path = await prepare(name),
    { bytes } = await decompressSWF(new Uint8Array(await readFile(probe))),
    tags = [...iterTags(bytes, readHeader(bytes).tagsOffset)];
  const tag = choose(tags);
  if (tag.code === 76) {
    const index = Buffer.from(tag.body).indexOf(Buffer.from('_-YE\0'));
    if (index < 0) throw new Error('Carrier binding not found.');
    tag.body[index + 3] ^= 1;
  } else tag.body[tag.body.length - 1] ^= 1;
  const candidate = resolve(path, 'mutated.swf');
  await writeFile(candidate, bytes);
  run(name, path, candidate, expected);
}
await writeFile(
  resolve(capture, 'rejecting-controls', 'results.json'),
  JSON.stringify(results, null, 2) + '\n',
);
console.log(
  `${results.length} meaningful rejecting mutations passed; all outputs stayed below ${resolve(capture, 'rejecting-controls')}.`,
);
