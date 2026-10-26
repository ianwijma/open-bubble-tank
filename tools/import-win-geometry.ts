/** Numeric win-screen layout and frame alpha only; artwork stays in the supplied SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((sprite) => [sprite.id, sprite]));
type Placement = (typeof symbols.sprites)[number]['placements'][number];
function list(id: number, frame = 1) {
  const depths = new Map<number, Placement>();
  for (const p of sprites.get(id)!.placements) {
    if (p.frame > frame) break;
    if (p.remove) depths.delete(p.depth);
    else depths.set(p.depth, { ...depths.get(p.depth), ...p });
  }
  return [...depths.values()].map((p) => ({
    ...p,
    charId: p.charId!,
    matrix: p.matrix!,
  }));
}
function bounds(id: number): { xMin: number; yMin: number; xMax: number; yMax: number } {
  const leaf = [...symbols.shapes, ...symbols.texts, ...symbols.editTexts].find((s) => s.id === id);
  if (leaf?.bounds) return leaf.bounds;
  const corners = list(id).flatMap((p) => {
    const b = bounds(p.charId),
      m = p.matrix;
    return [b.xMin, b.xMax].flatMap((x) =>
      [b.yMin, b.yMax].map((y) => ({
        x: m.a * x + m.c * y + m.tx,
        y: m.b * x + m.d * y + m.ty,
      })),
    );
  });
  return {
    xMin: Math.min(...corners.map((p) => p.x)),
    yMin: Math.min(...corners.map((p) => p.y)),
    xMax: Math.max(...corners.map((p) => p.x)),
    yMax: Math.max(...corners.map((p) => p.y)),
  };
}
function piece(p: ReturnType<typeof list>[number], x: number, y: number) {
  const b = bounds(p.charId),
    text = symbols.texts.find((t) => t.id === p.charId);
  let fontId = 0,
    baseline: number | undefined,
    copy = '';
  for (const record of text?.records ?? []) {
    fontId = record.fontId ?? fontId;
    if (record.y !== undefined && baseline !== undefined && record.y !== baseline) copy += '\n';
    baseline = record.y ?? baseline;
    const font = symbols.fonts.find((f) => f.id === fontId);
    copy += record.glyphs.map((g) => String.fromCodePoint(font?.codeTable[g.index] ?? 63)).join('');
  }
  const first = text?.records[0];
  return {
    symbol: p.charId,
    name: p.name ?? '',
    x: x + p.matrix.tx / 20,
    y: y + p.matrix.ty / 20,
    bounds: {
      x: b.xMin / 20,
      y: b.yMin / 20,
      width: (b.xMax - b.xMin) / 20,
      height: (b.yMax - b.yMin) / 20,
    },
    ...(first
      ? {
          text: copy,
          font: first.fontId === 361 ? 'Billo' : 'Arial',
          size: first.height! / 20,
          color:
            '#' +
            first
              .color!.slice(0, 3)
              .map((v) => v.toString(16).padStart(2, '0'))
              .join(''),
          lineHeight:
            text!.records.length > 1 ? (text!.records[1].y! - first.y!) / 20 : first.height! / 20,
        }
      : {}),
  };
}
const wrapper = list(2276).find((p) => p.name === '_-7b')!;
const inside = list(2275).find((p) => p.name === 'ws_inside')!;
const origin = {
  x: 275 + (wrapper.matrix.tx + inside.matrix.tx) / 20,
  y: 225 + (wrapper.matrix.ty + inside.matrix.ty) / 20,
};
// User-requested omission of retired pack navigation and its two promotional text blocks.
const omittedSymbols = [2266, 2270, 2272];
const result = {
  symbol: 2276,
  wrapper: 2275,
  inside: 2274,
  backdrop: piece(list(2276)[0], 275, 225),
  pieces: list(2274)
    .filter((p) => !omittedSymbols.includes(p.charId))
    .map((p) => piece(p, origin.x, origin.y)),
  fade: Array.from({ length: 25 }, (_, i) => list(2275, i + 1)[0].color?.mult[3] ?? 1),
  omittedSymbols,
};
await writeFile('src/game/data/win-geometry.json', JSON.stringify(result) + '\n');
console.log('Imported authored win geometry and fade; retired pack promotion omitted.');
