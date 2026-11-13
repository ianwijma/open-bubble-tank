/** Repeatable numeric checkpoint import from independently verified caller-owned
 * original captures. Run verification first; no production timeline code imported.
 * node tools/reference/pickup-clock-fixture.mjs BEFORE_DIR INSIDE_DIR
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
// A fresh run uses unmodified source randomness, so its literal trace/multiplicity
// differ. Declare only that retained trace identity before independent semantic
// verification; this mode never writes production fixtures or qualifies behavior.
if (process.argv[2] === '--declare-trace') {
  const path = resolve(process.argv[3]),
    cohort = process.argv.includes('--inside-enter') ? 'inside' : 'before';
  if (!path.startsWith(resolve('reference-captures') + sep))
    throw new Error('Caller-owned capture required.');
  const fixture = JSON.parse(await readFile('tests/fixtures/pickup-clock-original.json', 'utf8'));
  const observed = JSON.parse(await readFile(resolve(path, 'observation.json'), 'utf8'));
  const start = observed.trace.indexOf('BT3_PICKUP_BEGIN');
  if (start < 0 || observed.trace.at(-1) !== 'BT3_PICKUP_DONE 180')
    throw new Error('Incomplete trace declaration.');
  const raw = observed.trace.slice(start);
  fixture[cohort].traceSha256 = createHash('sha256').update(raw.join('\n')).digest('hex');
  fixture[cohort].samples = raw.filter((line) => line.startsWith('BT3_PICKUP_SAMPLE ')).length;
  await writeFile(
    resolve(path, 'observation-fixture.json'),
    JSON.stringify(fixture, null, 2) + '\n',
  );
  console.log(
    'Declared trace bytes/count only; original preservation, behavior, poses and runtime remain unverified.',
  );
  process.exit(0);
}
const [before, inside] = process.argv.slice(2),
  output = {},
  identities = {};
for (const [cohort, path] of Object.entries({ before, inside })) {
  if (!path || !resolve(path).startsWith(resolve('reference-captures') + sep))
    throw new Error('Caller-owned verified captures required.');
  const read = (name) => readFile(resolve(path, name), 'utf8').then(JSON.parse);
  const verified = await read('verified-probe.json'),
    observed = await read('observation.json');
  if (!verified.proof.allOriginalPayloadsAndOrderPreserved)
    throw new Error('Unverified original preservation.');
  const raw = observed.trace.slice(observed.trace.indexOf('BT3_PICKUP_BEGIN'));
  if (
    createHash('sha256').update(raw.join('\n')).digest('hex') !== verified.observation.traceSha256
  )
    throw new Error('Verified trace digest differs.');
  const samples = raw.flatMap((line, j) => {
    const w = line.split(' ');
    if (w[0] !== 'BT3_PICKUP_SAMPLE') return [];
    const c = raw[j + 1].split(' ');
    return [
      {
        phase: w[1],
        label: w[2],
        tick: +w[3],
        frame: +w[5],
        r: +w[16],
        child: c.slice(5, 9).map(Number),
      },
    ];
  });
  if (samples.length !== verified.observation.samples) throw new Error('Verified count differs.');
  output[cohort] = {};
  for (const label of new Set(samples.map((s) => s.label))) {
    const rows = samples.filter((s) => s.label === label),
      randomResults = [],
      checkpoints = [];
    for (let tick = 1; tick <= 180; tick++) {
      const enter = rows.find((s) => s.phase === 'enter' && s.tick === tick),
        exit = rows.filter((s) => s.phase === 'exit' && s.tick === tick).at(-1);
      const script =
        !label.endsWith('50') &&
        (tick === 1 ||
          (enter.frame === 1 && !(cohort === 'inside' && tick === 2)) ||
          (tick === 90 && ['held1', 'held5'].includes(label)));
      if (script) randomResults.push(exit.r);
      if ([1, 2, 3, 12, 20, 21, 31, 32, 40, 41, 60, 89, 90, 91, 120, 160, 180].includes(tick))
        checkpoints.push([tick, enter.frame, exit.frame, enter.child, exit.child]);
    }
    output[cohort][label] = { randomResults, checkpoints };
  }
  identities[cohort] = {
    probeSha256: verified.probe.sha256,
    traceSha256: createHash('sha256').update(raw.join('\n')).digest('hex'),
    samples: samples.length,
  };
  identities.originalSha256 = verified.original.sha256;
  identities.runtimeSha256 = observed.modules.modules.map((m) => m.sha256);
  identities.browserVersion = observed.browserVersion;
}
await writeFile('tests/fixtures/pickup-clock-original.json', JSON.stringify(identities) + '\n');
await writeFile('tests/fixtures/pickup-pose-original.json', JSON.stringify(output) + '\n');
console.log(
  'Imported two qualified pickup cohorts, 24 retained roots and408 ENTER/EXIT pose checkpoints.',
);
