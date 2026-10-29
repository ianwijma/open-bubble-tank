/** Creator803/771/992 layout and text metadata. No original paths, fonts or media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { createSwfLayout } from './lib/swf-layout';
import type { DisplayPlacement, SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const layout = createSwfLayout(symbols);
const list = (id: number, frame = 1) => buildDisplayList(sprites.get(id)!, frame);
function field(p: DisplayPlacement) {
  const t = symbols.editTexts.find((t) => t.id === p.charId)!,
    f = symbols.fonts.find((f) => f.id === t.fontId)!;
  const size = t.fontHeight / 20,
    ascent = (f.ascent ?? 20480) / 20,
    descent = (f.descent ?? 0) / 20;
  return {
    name: p.name ?? '',
    symbol: p.charId,
    x: p.matrix.tx / 20 + t.bounds.xMin / 20,
    y: p.matrix.ty / 20 + t.bounds.yMin / 20,
    width: (t.bounds.xMax - t.bounds.xMin) / 20,
    height: (t.bounds.yMax - t.bounds.yMin) / 20,
    fontId: f.id,
    font: f.name.replaceAll('\0', ''),
    size,
    ascent,
    lineHeight: ((ascent + descent) * size) / 1024 + (t.leading ?? 0) / 20,
    color: t.color ?? [255, 255, 255, 255],
    align: t.align ?? 0,
    spacing: Number(t.text.match(/letterSpacing="([\d.-]+)"/)?.[1] ?? 0),
    bold: !!f.bold,
    italic: !!f.italic,
    wordWrap: !!t.flags?.wordWrap,
  };
}
const creator = list(969),
  stats = list(803),
  library = list(771),
  row = list(992),
  scroll = list(764);
const origin = creator.find((p) => p.name === 'Stats_mc')!.matrix;
const lib = stats.find((p) => p.name === 'Library_mc')!.matrix;
function rect(id: number) {
  const b = layout.bounds(layout.collect(id, 1, 'up'));
  return b;
}
const mask = rect(library.find((p) => p.clipDepth === 13)!.charId),
  inside = library.find((p) => p.name === 'inside_mc')!.matrix,
  preview = library.find((p) => p.name === 'clickArea_mc')!,
  previewBounds = rect(preview.charId);
const tabNames = [
  ['body_mc', 1, 'Body'],
  ['primary_mc', 2, 'Primary'],
  ['secondary_mc', 3, 'Secondary'],
  ['interface_mc', 5, 'Passive'],
  ['EnemyWeapons_mc', 4, 'Weapons'],
  ['behavior_mc', 6, 'Behavior'],
] as const;
const tabs = tabNames.map(([name, category, label]) => {
  const p = stats.find((p) => p.name === name)!;
  return {
    name,
    category,
    label,
    symbol: p.charId,
    matrix: p.matrix,
    bounds: rect(p.charId),
    art: [layout.collect(p.charId, 1, 'up'), layout.collect(p.charId, 2, 'up')],
  };
});
const codes = Object.fromEntries(
  [
    ...(await readFile(`${root}/re/bt3/export_scripts_deobf/scripts/_-HJ.as`, 'utf8')).matchAll(
      /"intObjID":(\d+),[\s\S]*?"intCode":(\d+)/g,
    ),
  ].map((m) => [m[1], Number(m[2])]),
);
const statsFields = stats
    .filter((p) => symbols.editTexts.some((t) => t.id === p.charId))
    .map(field),
  rowFields = row.filter((p) => p.name === 'name_txt' || p.name === 'cost_txt').map(field),
  caption = field(library.find((p) => p.charId === 770)!);
const fonts = Object.fromEntries(
  [...new Set([...statsFields, ...rowFields, caption].map((f) => f.fontId))].map((id) => {
    const f = symbols.fonts.find((f) => f.id === id)!;
    return [
      id,
      Object.fromEntries(
        f.codeTable.map((code, i) => [String.fromCharCode(code), (f.advances?.[i] ?? 10240) / 20]),
      ),
    ];
  }),
);
const data = {
  origin,
  fonts,
  stats: {
    symbol: 803,
    fields: statsFields,
    background: layout.collect(739, 1, 'up', stats.find((p) => p.depth === 42)!.matrix),
    header: stats
      .filter((p) => p.depth >= 50)
      .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix)),
  },
  library: {
    symbol: 771,
    matrix: lib,
    bounds: rect(757),
    mask,
    inside: { x: inside.tx / 20, y: inside.ty / 20 },
    preview: { x: preview.matrix.tx / 20, y: preview.matrix.ty / 20, bounds: previewBounds },
    caption,
  },
  tabs,
  row: {
    symbol: 992,
    height: 20,
    visible: 9,
    bounds: rect(992),
    fields: rowFields,
    states: [1, 2, 3, 4].map((frame) => {
      const ps = list(992, frame),
        bg = symbols.shapes.find((s) => s.id === ps.find((p) => p.depth === 1)!.charId) as any;
      return { color: bg.fills.find((f: any) => f.kind === 'solid').color };
    }),
    codes,
  },
  scroll: {
    matrix: library.find((p) => p.name === 'scroll_mc')!.matrix,
    pieces: scroll.map((p) => ({
      name: p.name!,
      symbol: p.charId,
      matrix: p.matrix,
      bounds: rect(p.charId),
      frameBounds: [1, 2, 3].map((frame) =>
        layout.bounds(
          layout.collect(p.charId, Math.min(frame, sprites.get(p.charId)!.frameCount), 'up'),
        ),
      ),
      art: [1, 2, 3].map((frame) =>
        layout.collect(p.charId, Math.min(frame, sprites.get(p.charId)!.frameCount), 'up'),
      ),
    })),
  },
};
await writeFile('src/game/data/creator-palette.json', JSON.stringify(data) + '\n');
console.log(
  `Imported ${tabs.length} palette tabs, ${data.stats.fields.length} stats fields and ${Object.keys(codes).length} indicators. No artwork.`,
);
