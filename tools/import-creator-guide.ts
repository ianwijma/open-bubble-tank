/** Numeric tutorial968 layout; original artwork remains in the runtime SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { createSwfLayout } from './lib/swf-layout';
import type { SymbolResult } from '../src/game/assets/asset-pack';

const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const layout = createSwfLayout(symbols),
  sprite = symbols.sprites.find((s) => s.id === 968)!,
  parent = buildDisplayList(
    symbols.sprites.find((s) => s.id === 969)!,
    1,
  ).find((p) => p.name === 'tutorial')!.matrix;
function pieces(id: number, frame = 1) {
  return layout.collect(id, frame, 'up').map((piece) => {
    if (piece.kind !== 'text') return piece;
    const text = symbols.texts.find((t) => t.id === piece.id)!,
      font = symbols.fonts.find((f) => f.id === text.records.find((r) => r.fontId)?.fontId)!;
    return {
      ...piece,
      font: font.name.replaceAll('\0', ''),
      bold: !!font.bold,
      italic: !!font.italic,
    };
  });
}
const frames = Array.from({ length: sprite.frameCount - 1 }, (_, i) => {
  const frame = i + 2,
    placements = buildDisplayList(sprite, frame),
    controls = placements.filter((p) => ['back_tut', 'next_tut'].includes(p.name ?? '')),
    staticIds = placements.filter((p) => !controls.includes(p)).map((p) => p.charId),
    art = placements
      .filter((p) => staticIds.includes(p.charId))
      .flatMap((p) =>
        pieces(p.charId).map((piece) => ({
          ...piece,
          matrix: layout.multiply(p.matrix, piece.matrix),
        })),
      );
  return {
    frame,
    staticIds,
    art,
    text: art
      .filter((p) => p.kind === 'text')
      .map((p) => {
        let y: number | undefined;
        return p.glyphs
          .map((g: { text: string; y: number }) => {
            const separator = y !== undefined && y !== g.y ? '\n' : '';
            y = g.y;
            return separator + g.text;
          })
          .join('');
      })
      .join('\n'),
    buttons: controls.map((p) => ({
      name: p.name!,
      symbol: p.charId,
      matrix: p.matrix,
      bounds: layout.bounds(pieces(p.charId)),
      art: [pieces(p.charId), pieces(p.charId, 2)],
    })),
  };
});
await writeFile(
  'src/game/data/creator-guide.json',
  JSON.stringify({ symbol: 968, parent, frames }) + '\n',
);
console.log(
  frames.map((f) => ({
    frame: f.frame,
    text: f.text,
    buttons: f.buttons.map((b) => ({
      name: b.name,
      x: b.matrix.tx / 20,
      y: b.matrix.ty / 20,
      bounds: b.bounds,
    })),
  })),
);
