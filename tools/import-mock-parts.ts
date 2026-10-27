/** Numeric placement timelines and procedural ellipse facts; no original paths/media. */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SpriteInfo } from '../src/game/assets/asset-pack';
import { PARTS } from '../src/game/data/catalog';

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
for (const part of PARTS.filter((p) => p.id >= 2000)) visit(part.symbol);
const selected = [...sprites.values()]
  .filter((s) => reachable.has(s.id))
  .map(({ id, frameCount, placements }) => ({ id, frameCount, placements }));
const shapes = symbols.shapes
  .filter((s: { id: number }) => reachable.has(s.id))
  .map((s: { id: number; bounds: unknown }) => ({ id: s.id, bounds: s.bounds }));
const fitted = spawnSync('python3', ['tools/import-mock-part-leaves.py', root], {
  encoding: 'utf8',
});
if (fitted.status !== 0) throw new Error(fitted.stderr || 'Procedural ellipse import failed.');
const leafFacts = JSON.parse(fitted.stdout);
for (const shape of shapes)
  //23 is the invisible green muzzle marker. Keep its bounds, but no paint.
  if (!leafFacts[shape.id] && shape.id !== 23)
    throw new Error(`No procedural approximation for reachable part leaf ${shape.id}.`);
await writeFile(
  'src/game/data/mock-part-timelines.json',
  JSON.stringify({ sprites: selected, shapes }) + '\n',
);
await writeFile('src/game/data/mock-part-leaves.json', JSON.stringify(leafFacts) + '\n');
console.log(
  `Imported ${selected.length} part timelines and numeric ellipse approximations. No vector paths or media.`,
);
