/** Import public creator release snapshots and identities, without media or tank codes. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TankPart } from '../src/game/core/types';

interface Manifest {
  scenario: string;
  sha256: string;
  browser: string;
  ruffle: string;
  observedDpr: number;
  captureToolSha256: string;
  pageErrors: string[];
  avmErrors: string[];
  captures: string[];
  pointerEvents: { type: string; offsetX: number; offsetY: number; buttons: number }[];
  observedRuntime: { modules: { sha256: string; language: string }[] };
  dragEvidence: { name: string; parts: TankPart[] }[];
}
const names = [
  'placed-pair',
  'inside-rotation',
  'click-reset-rotation',
  'click-reset-zero',
  'outside-rotation',
  'inside-scale',
  'click-reset-scale',
  'click-reset-unit',
  'outside-scale',
  'setup-unit',
  'setup-zero',
  'drag-rotation',
  'drag-reset-zero',
  'marquee-center',
  'marquee-placement',
  'marquee-front',
  'click-front',
  'marquee-delete',
];
const swfSha256 = 'f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153';
const directories = process.argv.slice(2);
if (directories.length !== 2) throw new Error('Pass original release manifests for DPR1 and DPR2.');
const runs = [],
  provenance = [],
  seen = new Set<number>();
let tool: string | undefined;
for (const directory of directories) {
  const bytes = await readFile(resolve(directory, 'manifest.json'));
  const m: Manifest = JSON.parse(bytes.toString('utf8'));
  if (
    m.scenario !== 'release' ||
    m.sha256 !== swfSha256 ||
    m.pageErrors.length ||
    !Array.isArray(m.avmErrors) ||
    m.avmErrors.length ||
    ![1, 2].includes(m.observedDpr) ||
    seen.has(m.observedDpr) ||
    (tool && tool !== m.captureToolSha256)
  )
    throw new Error(`${directory}: expected a fresh DPR, unchanged SWF/tool and no JS/AVM errors.`);
  if (
    m.dragEvidence.length !== names.length ||
    names.some((name, i) => m.dragEvidence[i].name !== name || !m.captures.includes(`${name}-code`))
  )
    throw new Error(`${directory}: incomplete ordered public Save/Copy sequence.`);
  if (
    m.dragEvidence.some((row, i) => row.parts.length !== (i >= 14 && i <= 16 ? 4 : 2)) ||
    !m.observedRuntime.modules.some((module) => module.language === 'WebAssembly') ||
    !m.observedRuntime.modules.some((module) => module.language === 'JavaScript') ||
    m.observedRuntime.modules.some((module) => !/^[0-9a-f]{64}$/.test(module.sha256))
  )
    throw new Error(
      `${directory}: unexpected part population or incomplete loaded-module identity.`,
    );
  for (const row of m.dragEvidence)
    for (const p of row.parts) {
      if (
        p.type !== 1001 ||
        typeof p.key !== 'string' ||
        typeof p.twin !== 'string' ||
        [p.x, p.y, p.rotation, p.scale, p.radius].some((n) => !Number.isFinite(n))
      )
        throw new Error(`${directory}: incomplete numerical part data.`);
      if (
        row.parts.filter((part) => part.key === p.key).length !== 1 ||
        !row.parts.some((twin) => twin.key === p.twin && twin.twin === p.key && twin.key !== p.key)
      )
        throw new Error(`${directory}: incomplete reciprocal pair membership.`);
    }
  if (
    !m.pointerEvents.length ||
    m.pointerEvents.some((e) => !Number.isFinite(e.offsetX) || !Number.isFinite(e.offsetY))
  )
    throw new Error(`${directory}: missing numerical input observation.`);
  seen.add(m.observedDpr);
  tool = m.captureToolSha256;
  runs.push({
    dpr: m.observedDpr,
    snapshots: m.dragEvidence.map(({ name, parts }) => ({
      name,
      parts: parts.map(({ key, type, twin, x, y, rotation, scale, radius }) => ({
        key,
        type,
        twin,
        x,
        y,
        rotation,
        scale,
        radius,
      })),
    })),
  });
  provenance.push({
    dpr: m.observedDpr,
    browser: m.browser,
    ruffle: m.ruffle,
    manifestSha256: createHash('sha256').update(bytes).digest('hex'),
    toolSha256: m.captureToolSha256,
    inputSha256: createHash('sha256')
      .update(
        JSON.stringify(
          m.pointerEvents.map(({ type, offsetX, offsetY, buttons }) => ({
            type,
            offsetX,
            offsetY,
            buttons,
          })),
        ),
      )
      .digest('hex'),
    modules: m.observedRuntime.modules.map(({ sha256 }) => sha256),
  });
}
await writeFile(
  resolve('tests/fixtures/creator-release-reference.json'),
  JSON.stringify({
    generatedBy: 'bun tools/import-creator-release-reference.ts <manifest-directory>...',
    swfSha256,
    scope:
      'Original public marquee, slider, workspace click, drag, layering, palette drop and Delete Save/Copy snapshots. Numeric metadata and observed identities only. Paint/selection are separate retained foreground captures; no AVM/game/clock edits, Adobe or full-creator equivalence claim.',
    provenance,
    runs,
  }) + '\n',
);
console.log(
  `Imported ${runs.reduce((n, r) => n + r.snapshots.length, 0)} creator release snapshots.`,
);
