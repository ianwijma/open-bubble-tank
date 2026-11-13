/** Import numeric effect display lists and binding provenance, never artwork or sound. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
import effects from '../src/game/data/effect-art.json';
import screens from '../src/game/data/screen-effect-art.json';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const input = await readFile(`${root}/re/bt3/uncompressed.swf`);
const { bytes } = await decompressSWF(new Uint8Array(input));
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((sprite) => [sprite.id, sprite]));
const selected = new Set<number>(),
  leaves = new Set<number>();
function visit(id: number) {
  if (selected.has(id) || leaves.has(id)) return;
  const sprite = sprites.get(id);
  if (!sprite) {
    leaves.add(id);
    return;
  }
  selected.add(id);
  for (const placement of sprite.placements)
    if (placement.charId !== undefined) visit(placement.charId);
}
const roots = [];
for (const [kind, art] of Object.entries({ ...effects, ...screens })) {
  const bindings = Object.entries(symbols.symbolNames).filter(([, name]) => name === art.className);
  if (bindings.length !== 1 || Number(bindings[0][0]) !== art.symbol)
    throw new Error(`Unexpected original effect binding ${kind}/${art.className}`);
  const sprite = sprites.get(art.symbol);
  if (!sprite || sprite.frameCount !== art.frames)
    throw new Error(`Unexpected original effect timeline ${kind}/${art.symbol}`);
  const pcode = await readFile(`${root}/re/bt3/export_pcode/scripts/${art.className}.pcode`);
  roots.push({
    kind,
    className: art.className,
    symbol: art.symbol,
    frameCount: sprite.frameCount,
    pcodeSha256: createHash('sha256').update(pcode).digest('hex'),
  });
  visit(art.symbol);
}
await writeFile(
  'src/game/data/effect-clips.json',
  JSON.stringify({
    sourceSha256: createHash('sha256').update(input).digest('hex'),
    roots,
    leafSymbols: [...leaves].sort((a, b) => a - b),
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
  `Imported ${roots.length} effect roots, ${selected.size} numeric sprite timelines and ${leaves.size} leaf references.`,
);
