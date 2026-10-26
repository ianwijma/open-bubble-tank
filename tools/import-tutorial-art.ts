/** Import stopped field-caption frame IDs, placements and readable fallback text; no artwork. */
import { readFile, writeFile } from 'node:fs/promises';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprite = symbols.sprites.find((s) => s.id === 1667)!;
const frames = [2, 3, 4, 5, 6].map((frame) => {
  const list = new Map<number, (typeof sprite.placements)[number]>();
  for (const p of sprite.placements) {
    if (p.frame > frame) break;
    if (p.remove) list.delete(p.depth);
    else list.set(p.depth, { ...list.get(p.depth), ...p });
  }
  return {
    frame,
    texts: [...list.values()].flatMap((p) => {
      const text = symbols.texts.find((t) => t.id === p.charId);
      if (!text) return [];
      let font = symbols.fonts[0],
        size = 25,
        color = [255, 255, 255, 102],
        x = 0,
        y = 0;
      return text.records
        .map((record) => {
          if (record.fontId !== undefined)
            font = symbols.fonts.find((f) => f.id === record.fontId)!;
          if (record.height !== undefined) size = record.height / 20;
          if (record.color) color = record.color;
          if (record.x !== undefined) x = record.x / 20;
          if (record.y !== undefined) y = record.y / 20;
          const label = record.glyphs
            .map((g) => String.fromCodePoint(font.codeTable[g.index] ?? 63))
            .join('');
          const line = {
            text: label,
            x: p.matrix!.tx / 20 + text.matrix.tx / 20 + x,
            y: p.matrix!.ty / 20 + text.matrix.ty / 20 + y,
            size,
            color,
          };
          x += record.glyphs.reduce((sum, g) => sum + g.advance / 20, 0);
          return [line];
        })
        .flat();
    }),
  };
});
await writeFile(
  'src/game/data/tutorial-art.json',
  JSON.stringify({ symbol: sprite.id, stages: frames }) + '\n',
);
console.log('Imported five original stopped field-caption layouts.');
