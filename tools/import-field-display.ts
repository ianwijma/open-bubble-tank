/** Numeric authored field instances only. Reads supplied media; never writes to the research tree. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SymbolResult } from '../src/game/assets/asset-pack';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const input = await readFile(`${root}/re/bt3/uncompressed.swf`);
const { bytes } = await decompressSWF(new Uint8Array(input));
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((sprite) => [sprite.id, sprite]));
const selected = new Set<number>();
function visit(id: number) {
  if (selected.has(id)) return;
  selected.add(id);
  for (const child of sprites.get(id) ? buildDisplayList(sprites.get(id)!, 0) : [])
    visit(child.charId);
}
visit(1551);
visit(117);
const metadata = {
  sourceSha256: createHash('sha256').update(input).digest('hex'),
  symbol: 1551,
  bottomSymbol: 117,
  sprites: Object.fromEntries(
    [...selected]
      .filter((id) => sprites.has(id))
      .sort((a, b) => a - b)
      .map((id) => [
        id,
        buildDisplayList(sprites.get(id)!, 0).map((p) => ({
          symbol: p.charId,
          depth: p.depth,
          name: p.name,
          clipDepth: p.clipDepth,
          matrix: p.matrix,
          color: p.color,
          cacheAsBitmap: p.cacheAsBitmap,
        })),
      ]),
  ),
};
await writeFile('src/game/data/field-display.json', JSON.stringify(metadata) + '\n');
console.log(
  `Imported ${Object.keys(metadata.sprites).length} field numeric sprite layouts (${metadata.sourceSha256}).`,
);
