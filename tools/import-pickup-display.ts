/** Import numeric pickup timelines for retained poses; never vector/media payloads. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const input = await readFile(`${root}/re/bt3/uncompressed.swf`);
const { bytes } = await decompressSWF(new Uint8Array(input));
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const roots = [];
const selected = new Set<number>();
function visit(id: number) {
  if (selected.has(id)) return;
  const sprite = symbols.sprites.find((sprite) => sprite.id === id);
  if (!sprite) return;
  selected.add(id);
  for (const p of sprite.placements) if (p.charId !== undefined) visit(p.charId);
}
for (const [value, className] of [
  [1, '_-Bd'],
  [5, '_-Oh'],
  [50, '_-5A'],
] as const) {
  const symbol = Number(
    Object.entries(symbols.symbolNames).find(([, name]) => name === className)?.[0],
  );
  const sprite = symbols.sprites.find((sprite) => sprite.id === symbol);
  if (!sprite) throw new Error(`Missing pickup ${className}`);
  visit(symbol);
  // The AS/pcode identifies registration, not native script scheduling.
  const pcode = await readFile(`${root}/re/bt3/export_pcode/scripts/${className}.pcode`);
  roots.push({
    value,
    className,
    symbol,
    frameCount: sprite.frameCount,
    pcodeSha256: createHash('sha256').update(pcode).digest('hex'),
    registersFrame1: pcode.toString().includes('"addFrameScript"'),
  });
}
await writeFile(
  'src/game/data/pickup-display.json',
  JSON.stringify({
    sourceSha256: createHash('sha256').update(input).digest('hex'),
    roots,
    sprites: Object.fromEntries(
      [...selected]
        .sort((a, b) => a - b)
        .map((id) => {
          const { frameCount, placements } = symbols.sprites.find((sprite) => sprite.id === id)!;
          return [id, { id, frameCount, placements }];
        }),
    ),
  }) + '\n',
);
console.log(`Imported three pickup roots and ${selected.size} numeric sprite timelines.`);
