/** Import numerical public slider input/export evidence; never copy original media or codes. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { TankPart, Vec } from '../src/game/core/types';

interface Pointer extends Vec {
  type: string;
  offsetX: number;
  offsetY: number;
  buttons: number;
}
interface Manifest {
  scenario: string;
  sha256: string;
  browser: string;
  ruffle: string;
  observedDpr: number;
  captureToolSha256: string;
  captures: string[];
  pageErrors: string[];
  pointerEvents: Pointer[];
  observedRuntime: { modules: { sha256: string }[] };
  actions: { action: string; x: number; y: number }[];
  dragEvidence: { name: string; parts: TankPart[] }[];
}
const directories = process.argv.slice(2);
if (!directories.length) throw new Error('Pass one or more transform manifest directories.');
const expectedSwf = 'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153';
const names = [
  'rotation-fractional',
  'rotation-endpoint',
  'rotation-midpoint',
  'rotation-zero',
  'scale-fractional',
  'scale-maximum',
  'scale-minimum',
  'scale-one',
];
const point = (e: Pointer): Vec => ({ x: e.offsetX, y: e.offsetY });
const parts = (values: TankPart[]) =>
  values.map(({ key, type, twin, x, y, rotation, scale, radius }) => ({
    key,
    type,
    twin,
    x,
    y,
    rotation,
    scale,
    radius,
  }));
const cases = [],
  provenance = [];
const seenDprs = new Set<number>();
let toolSha256: string | undefined;
for (const directory of directories) {
  const bytes = await readFile(resolve(directory, 'manifest.json'));
  const m: Manifest = JSON.parse(bytes.toString('utf8'));
  if (
    m.scenario !== 'transform' ||
    m.sha256 !== expectedSwf ||
    m.pageErrors.length ||
    ![1, 2].includes(m.observedDpr)
  )
    throw new Error(
      `${directory}: expected unchanged original transform capture without page errors.`,
    );
  if (seenDprs.has(m.observedDpr) || (toolSha256 && toolSha256 !== m.captureToolSha256))
    throw new Error(`${directory}: expected a fresh DPR and the same capture tool.`);
  seenDprs.add(m.observedDpr);
  toolSha256 = m.captureToolSha256;
  if (
    m.dragEvidence.length !== 9 ||
    m.dragEvidence[0].name !== 'transform-placed-pair' ||
    names.some((name, i) => m.dragEvidence[i + 1].name !== name)
  )
    throw new Error(`${directory}: unexpected export sequence.`);
  if (
    m.dragEvidence.some((row) =>
      row.parts.some((p) =>
        [p.x, p.y, p.rotation, p.scale, p.radius].some((value) => !Number.isFinite(value)),
      ),
    ) ||
    m.pointerEvents.some(
      (event) => !Number.isFinite(event.offsetX) || !Number.isFinite(event.offsetY),
    )
  )
    throw new Error(`${directory}: incomplete numerical pointer/part data.`);
  const gestures: { down: Pointer; moves: Pointer[] }[] = [];
  let gesture: (typeof gestures)[number] | undefined;
  for (const event of m.pointerEvents) {
    if (event.type === 'pointerdown') gesture = { down: event, moves: [] };
    else if (gesture && event.type === 'pointermove' && event.buttons === 1)
      gesture.moves.push(event);
    else if (gesture && event.type === 'pointerup') {
      if (gesture.moves.length) gestures.push(gesture);
      gesture = undefined;
    }
  }
  if (
    gestures.length !== 9 ||
    gestures[0].moves.length !== 20 ||
    gestures.slice(1).some((g) => g.moves.length !== 1)
  )
    throw new Error(
      `${directory}: expected one palette gesture and eight single-move slider gestures.`,
    );
  for (const [i, name] of names.entries()) {
    const row = m.dragEvidence[i + 1],
      g = gestures[i + 1];
    if (!m.captures.includes(`${name}-held`) || !m.captures.includes(`${name}-code`))
      throw new Error(`${directory}: missing held or Save/Copy capture.`);
    if (
      row.parts.length !== 2 ||
      row.parts.some((p) => p.type !== 1001) ||
      row.parts[0].twin !== row.parts[1].key ||
      row.parts[1].twin !== row.parts[0].key
    )
      throw new Error(`${directory}: selected pair membership changed unexpectedly.`);
    cases.push({
      name,
      dpr: m.observedDpr,
      control: name.startsWith('rotation') ? 'Rotate_mc' : 'Resize_mc',
      down: point(g.down),
      moves: g.moves.map(point),
      before: parts(m.dragEvidence[i].parts),
      expected: parts(row.parts),
    });
  }
  provenance.push({
    dpr: m.observedDpr,
    browser: m.browser,
    ruffle: m.ruffle,
    manifestSha256: createHash('sha256').update(bytes).digest('hex'),
    toolSha256: m.captureToolSha256,
    modules: m.observedRuntime.modules.map(({ sha256 }) => sha256),
  });
}
await writeFile(
  resolve('tests/fixtures/creator-transform-reference.json'),
  JSON.stringify({
    generatedBy: 'bun tools/import-creator-transform-reference.ts <manifest-directory>...',
    swfSha256: expectedSwf,
    scope:
      'Original public click selection, slider input and Save/Copy exports in observed Ruffle/Chrome. Numerical data only; no AVM/clock/state injection, Adobe or full-creator parity claim.',
    provenance,
    cases,
  }) + '\n',
);
console.log(`Imported ${cases.length} numerical creator transform cases.`);
