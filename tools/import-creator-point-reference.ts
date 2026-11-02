/** Numeric public-input/export goldens only. Never copy SWF, artwork or tank-code bytes. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Vec } from '../src/game/core/types';

interface Pointer {
  type: string;
  offsetX: number;
  offsetY: number;
  buttons: number;
}
interface Part extends Vec {
  key: string;
  twin: string;
}
interface Manifest {
  sha256: string;
  observedDpr?: number;
  captures: string[];
  pageErrors: string[];
  captureToolSha256: string;
  observedRuntime: { modules: { url: string; sha256: string }[] };
  pointerEvents: Pointer[];
  actions: { action: string; x?: number }[];
  dragEvidence: { name: string; parts: Part[] }[];
}
const root = resolve(process.argv[2] ?? 'reference-captures/creator-point-precision');
const expectedSwf = 'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153';
const point = (e: Pointer): Vec => ({ x: e.offsetX, y: e.offsetY });
const parts = (values: Part[]) => values.map(({ key, twin, x, y }) => ({ key, twin, x, y }));
async function load(name: string) {
  const m: Manifest = JSON.parse(await readFile(resolve(root, name, 'manifest.json'), 'utf8'));
  if (m.sha256 !== expectedSwf || m.pageErrors.length)
    throw new Error(`${name}: expected unchanged original SWF and no page errors.`);
  const groups: { down: Pointer; moves: Pointer[] }[] = [];
  let group: (typeof groups)[number] | undefined;
  for (const e of m.pointerEvents) {
    if (e.type === 'pointerdown') group = { down: e, moves: [] };
    else if (group && e.type === 'pointermove' && e.buttons === 1) group.moves.push(e);
    else if (group && e.type === 'pointerup') {
      if (group.moves.length) groups.push(group);
      group = undefined;
    }
  }
  const scales = m.actions.filter((a) => a.action === 'embedding-scale').map((a) => a.x!);
  if (scales.length !== 5 || scales.some((s) => !Number.isFinite(s) || s <= 0))
    throw new Error(`${name}: expected five recorded positive embedding scales.`);
  return { m, scales, groups };
}
const provenance: unknown[] = [];
const drag = [];
for (const name of ['original', 'original-dpr2']) {
  const { m, scales, groups } = await load(name);
  const gestures = groups.slice(-5);
  if (
    gestures.length !== 5 ||
    gestures.some((g, i) => g.moves.length !== [1, 1, 3, 32, 10][i]) ||
    m.dragEvidence.length !== 6
  )
    throw new Error(`${name}: unexpected drag/export sequence.`);
  provenance.push({
    capture: name,
    toolSha256: m.captureToolSha256,
    modules: m.observedRuntime.modules.map(({ sha256 }) => sha256),
  });
  for (const [i, g] of gestures.entries())
    drag.push({
      name: `${name}: ${m.dragEvidence[i + 1].name}`,
      dpr: m.observedDpr ?? 1,
      scale: scales[i],
      down: point(g.down),
      moves: g.moves.map(point),
      before: parts(m.dragEvidence[i].parts),
      expected: parts(m.dragEvidence[i + 1].parts),
    });
}
const { m, scales, groups } = await load('original-placement');
if (groups.length !== 5 || groups.some((g) => g.moves.length !== 20))
  throw new Error('Expected five complete palette gestures; exclude the clipped-input attempt.');
provenance.push({
  capture: 'original-placement',
  toolSha256: m.captureToolSha256,
  modules: m.observedRuntime.modules.map(({ sha256 }) => sha256),
});
const placement = groups.map((g, i) => {
  const previous = i ? m.dragEvidence[i - 1].parts : [];
  const added = m.dragEvidence[i].parts.filter((p) => !previous.some((b) => b.key === p.key));
  if (!added.length) throw new Error('A palette gesture did not place a part.');
  return {
    name: m.dragEvidence[i].name,
    dpr: m.observedDpr ?? 1,
    scale: scales[i],
    mouse: point(g.moves.at(-1)!),
    expected: parts(added),
  };
});
const output = resolve('tests/fixtures/creator-point-reference.json');
await mkdir(resolve('tests/fixtures'), { recursive: true });
await writeFile(
  output,
  JSON.stringify({
    generatedBy: 'bun tools/import-creator-point-reference.ts <capture-directory>',
    swfSha256: expectedSwf,
    scope:
      'Unmodified original in observed Ruffle/Chrome; public mouse input and Save/Copy exports. Host CSS scale and requested DPR vary. No AVM/clock/state injection. Numeric geometry only; not Adobe or full creator parity.',
    provenance,
    drag,
    placement,
  }) + '\n',
);
console.log(
  `Imported ${drag.length} drag and ${placement.length} placement numeric reference cases.`,
);
