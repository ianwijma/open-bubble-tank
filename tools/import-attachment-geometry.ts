/** Numeric display geometry only; never emits vector paths or original media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SpriteInfo } from '../src/game/assets/asset-pack';
import { STATUS_ART, PROTECTION_ART, INFECTED_ART } from '../src/game/data/status-art';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = await extractSymbols(bytes, { svg: false });
const sprites = new Map<number, SpriteInfo>(symbols.sprites.map((s: SpriteInfo) => [s.id, s]));
const reachable = new Set<number>();
function visit(id: number) {
  if (reachable.has(id)) return;
  reachable.add(id);
  for (const p of sprites.get(id)?.placements ?? []) if (p.charId !== undefined) visit(p.charId);
}
for (const id of [...Object.values(STATUS_ART), ...Object.values(PROTECTION_ART), INFECTED_ART])
  visit(id);
const selected = [...sprites.values()]
  .filter((s) => reachable.has(s.id))
  .map(({ id, frameCount, placements }) => ({ id, frameCount, placements }));
const shapes = [
  ...symbols.shapes.map((s: { id: number; bounds: unknown }) => ({ id: s.id, bounds: s.bounds })),
  // Script bounds use the start rectangle even while a MorphShape changes ratio.
  ...symbols.morphs.map((s: { id: number; startBounds: unknown }) => ({
    id: s.id,
    bounds: s.startBounds,
  })),
].filter((s: { id: number }) => reachable.has(s.id));
const covered = new Set([...selected, ...shapes].map((s) => s.id));
const missing = [...reachable].filter((id) => !covered.has(id));
if (missing.length) throw new Error(`Unsupported attachment geometry: ${missing.join(', ')}.`);
await writeFile(
  'src/game/data/attachment-geometry.json',
  JSON.stringify({ sprites: selected, shapes }) + '\n',
);
console.log(
  `Imported ${selected.length} attachment timelines and ${shapes.length} numeric bounds.`,
);
