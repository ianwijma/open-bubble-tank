/** Import numeric display-list facts for source-polled projectile clocks, never artwork. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
import art from '../src/game/data/projectile-art.json';
import mines from '../src/game/data/mine-art.json';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const movie = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(movie.symbols.sprites.map((sprite) => [sprite.id, sprite]));
const roots = {
  grow: art['2015'].symbol,
  flak: art['5004'].symbol,
  whip: art['3014'].symbol,
  sapper: art['4012'].symbol,
  enemyMine: mines.enemy.symbol,
  allyMine: mines.ally.symbol,
  seekerMine: mines.seeker.symbol,
};
const selected = new Set<number>();
function visit(id: number) {
  if (selected.has(id) || !sprites.has(id)) return;
  selected.add(id);
  for (const placement of sprites.get(id)!.placements)
    if (placement.charId) visit(placement.charId);
}
for (const id of Object.values(roots)) {
  if (!sprites.has(id)) throw new Error(`Missing projectile clip ${id}`);
  visit(id);
}
await writeFile(
  'src/game/data/projectile-clips.json',
  JSON.stringify({
    roots,
    sprites: Object.fromEntries(
      [...selected]
        .sort((a, b) => a - b)
        .map((id) => {
          const { frameCount, placements } = sprites.get(id)!;
          return [id, { id, frameCount, placements }];
        }),
    ),
  }) + '\n',
);
console.log(
  `Imported ${Object.keys(roots).length} roots and ${selected.size} numerical clip timelines.`,
);
