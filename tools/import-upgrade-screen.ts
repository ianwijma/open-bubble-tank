/** UpgradeMenu1935 numerical geometry/text metrics; supplied artwork stays in the browser. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols, shapeHitGeometry } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { createSwfLayout } from './lib/swf-layout';
import { editTextFields } from './lib/swf-edit-fields';
import type { SymbolResult, DisplayPlacement } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const layout = createSwfLayout(symbols),
  sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const list = (id: number, frame = 1) => buildDisplayList(sprites.get(id)!, frame);
function art(id: number, frame = 1) {
  return layout.collect(id, frame, 'up').map((p) => {
    if (p.kind !== 'text') {
      const shape = symbols.shapes.find((shape) => shape.id === p.id) as
        { fills: { kind: string; color: number[] }[]; lines: { color: number[] }[] } | undefined;
      if (!shape) return p;
      if (
        shape.fills.length > 1 ||
        shape.lines.length > 1 ||
        shape.fills.some((fill) => fill.kind !== 'solid')
      )
        throw new Error(`Upgrade UI shape${p.id} needs explicit multi-style import`);
      const paths = shapeHitGeometry(shape);
      return {
        ...p,
        kind: 'paths',
        paths: [
          ...paths.fills.map((fill) => ({
            d: fill.path,
            rule: fill.rule,
            fill: shape.fills[0]?.color,
          })),
          ...paths.strokes.map((stroke) => ({
            d: stroke.path,
            width: stroke.width,
            cap: stroke.cap,
            join: stroke.join,
            stroke: shape.lines[0]?.color,
          })),
        ],
      };
    }
    const text = symbols.texts.find((t) => t.id === p.id)!;
    const font = symbols.fonts.find((f) => f.id === text.records.find((r) => r.fontId)?.fontId)!;
    const advances = text.records.flatMap((record) =>
      record.glyphs.map((glyph) => glyph.advance / 20),
    );
    const textLines: {
      text: string;
      x: number;
      y: number;
      size: number;
      color: number[];
      width: number;
    }[] = [];
    p.glyphs.forEach(
      (
        glyph: { text: string; x: number; y: number; size: number; color: number[] },
        index: number,
      ) => {
        let line = textLines.at(-1);
        if (!line || line.y !== glyph.y || line.size !== glyph.size) {
          line = { ...glyph, text: '', width: 0 };
          textLines.push(line);
        }
        line.text += glyph.text;
        line.width = glyph.x + advances[index] - line.x;
      },
    );
    return {
      ...p,
      textLines,
      font: font.name.replaceAll('\0', ''),
      bold: !!font.bold,
      italic: !!font.italic,
    };
  });
}
function widget(id: number, frame = 1) {
  const ps = sprites.has(id) ? list(id, frame) : [],
    fields = editTextFields(symbols, ps);
  const staticPs = ps.filter((p) => !p.name && !fields.some((f) => f.symbol === p.charId));
  return {
    symbol: id,
    frame,
    leaf: !sprites.has(id),
    fields,
    staticDepths: staticPs.map((p) => p.depth),
    art: sprites.has(id)
      ? staticPs.flatMap((p) =>
          art(p.charId).map((leaf) => ({
            ...leaf,
            matrix: layout.multiply(p.matrix, leaf.matrix),
            ...(leaf.boundsMatrix
              ? { boundsMatrix: layout.multiply(p.matrix, leaf.boundsMatrix) }
              : {}),
          })),
        )
      : art(id),
  };
}
function piece(p: DisplayPlacement) {
  const ps = sprites.has(p.charId) ? list(p.charId) : [],
    fields = editTextFields(symbols, ps);
  const leaves = layout.collect(p.charId, 1, 'up');
  const bounds = layout.bounds([
    ...leaves,
    ...fields.map((f) => ({
      matrix: f.matrix,
      bounds: {
        xMin: f.x * 20,
        xMax: (f.x + f.width) * 20,
        yMin: f.y * 20,
        yMax: (f.y + f.height) * 20,
      },
    })),
  ]);
  return { name: p.name ?? '', symbol: p.charId, matrix: p.matrix, bounds };
}
const ps = list(1935, 2),
  foreground = ps.filter((p) => ['text_mc', 'buildTank_mc'].includes(p.name ?? '')).map(piece);
const viewers = ps.find((p) => p.name === 'viewers_mc')!;
const cards = list(viewers.charId)
  .map(piece)
  .sort((a, b) => a.name.localeCompare(b.name));
const edit = piece(list(cards[0].symbol).find((p) => p.name === 'edit_mc')!);
const ids = [1096, ...foreground.map((p) => p.symbol), cards[0].symbol, edit.symbol];
const widgets = ids.flatMap((id) =>
  Array.from(
    { length: id === cards[0].symbol || id === edit.symbol || id === 1923 ? 2 : 1 },
    (_, index) => widget(id, index + 1),
  ),
);
const result = {
  symbol: 1935,
  shade: piece(ps.find((p) => p.charId === 1096)!),
  foreground,
  viewers: { matrix: viewers.matrix, cards },
  edit,
  widgets,
  preview: { width: 158, height: 84 },
  omitted: ['searchTanks_mc', 'partsPack_mc', 'retired separator1906'],
};
await writeFile('src/game/data/upgrade-screen.json', JSON.stringify(result) + '\n');
console.log('Imported upgrade geometry/fields only', {
  widgets: widgets.length,
  cardFields: widgets.find((w) => w.symbol === cards[0].symbol)!.fields.map((f) => f.name),
});
