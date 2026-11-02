/** Creator803/771/992/928/915/865/1000/1002 layout and text metadata. No original paths, fonts or media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buttonDisplayList } from '../src/game/assets/button-display-list';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { CreatorPrimitive } from '../src/game/core/creator-controls';
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
    initialText: t.text.replace(/<[^>]*>/g, ''),
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
function nestedFields(
  id: number,
  frame: number,
  matrix: DisplayPlacement['matrix'],
  alpha = 1,
): ReturnType<typeof field>[] {
  if (symbols.editTexts.some((t) => t.id === id)) {
    const f = field({ charId: id, matrix } as DisplayPlacement);
    return [{ ...f, color: [...f.color.slice(0, 3), (f.color[3] ?? 255) * alpha] }];
  }
  const button = (symbols.buttons ?? []).find((b) => b.id === id),
    sprite = sprites.get(id);
  const placements = button ? buttonDisplayList(button, 'up') : sprite ? list(id, frame) : [];
  return placements.flatMap((p) =>
    nestedFields(p.charId, 1, layout.multiply(matrix, p.matrix), alpha * (p.color?.mult?.[3] ?? 1)),
  );
}
const advancedList = list(928, 2),
  confirmList = list(915, 12);
const piece = (
  p: DisplayPlacement,
  frames = (symbols.buttons ?? []).some((b) => b.id === p.charId) ? [1, 2, 3] : [1, 2],
) => ({
  name: p.name ?? '',
  symbol: p.charId,
  matrix: p.matrix,
  bounds: rect(p.charId),
  art: frames.map((frame, i) =>
    layout.collect(
      p.charId,
      frame,
      (symbols.buttons ?? []).some((b) => b.id === p.charId)
        ? (['up', 'over', 'down'] as const)[i]
        : 'up',
    ),
  ),
});
const advancedFields = advancedList
  .filter((p) => symbols.editTexts.some((t) => t.id === p.charId))
  .map(field);
const confirmFields = confirmList.flatMap((p) =>
  nestedFields(p.charId, p.name ? 11 : 1, p.matrix, p.color?.mult?.[3] ?? 1),
);
const advanced = {
  symbol: 928,
  origin: creator.find((p) => p.name === 'SecondaryStats_mc')!.matrix,
  tab: piece(list(928).find((p) => p.charId === 899)!),
  basicTab: piece(list(803, 2).find((p) => p.charId === 802)!),
  static: advancedList
    .filter((p) => !p.name && p.charId !== 916)
    .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix)),
  fields: advancedFields,
  suggested: piece(advancedList.find((p) => p.name === 'suggestedBox_mc')!),
  sliders: advancedList
    .filter((p) => p.name?.endsWith('Slider_mc'))
    .map((p) => {
      const children = list(p.charId),
        handle = children.find((p) => p.name === 'resizehandle_mc')!;
      return {
        name: p.name!,
        symbol: p.charId,
        matrix: p.matrix,
        track: children
          .filter((p) => !p.name)
          .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix)),
        handle: {
          symbol: handle.charId,
          matrix: handle.matrix,
          variants: [1, 2].map((f) => layout.collect(handle.charId, f, 'up')),
        },
      };
    }),
  confirm: {
    symbol: 915,
    matrix: advancedList.find((p) => p.name === 'ConfirmMenu_mc')!.matrix,
    fields: confirmFields,
    buttons: confirmList
      .filter((p) => p.name)
      .map((p) => ({
        ...piece(p, [11]),
        art: (['up', 'over', 'down'] as const).map((state) => layout.collect(p.charId, 11, state)),
        bounds: layout.bounds(layout.collect(p.charId, 11, 'up')),
      })),
    frames: Array.from({ length: 21 }, (_, i) => {
      const frame = i + 2,
        ps = list(915, frame);
      return {
        frame,
        fields: ps.flatMap((p) =>
          nestedFields(
            p.charId,
            p.name ? Math.min(11, frame - 1) : 1,
            p.matrix,
            p.color?.mult?.[3] ?? 1,
          ),
        ),
        art: ps
          .filter((p) => !symbols.editTexts.some((t) => t.id === p.charId))
          .flatMap((p) => {
            const art = layout.collect(
              p.charId,
              p.name ? Math.min(11, frame - 1) : 1,
              'up',
              p.matrix,
              p.ratio ?? 0,
            );
            return art.map((leaf: CreatorPrimitive) => {
              const alpha = p.color?.mult?.[3] ?? 1;
              return {
                ...leaf,
                fill: leaf.fill ? [...leaf.fill.slice(0, 3), (leaf.fill[3] ?? 255) * alpha] : null,
                stroke: leaf.stroke
                  ? {
                      ...leaf.stroke,
                      color: [
                        ...leaf.stroke.color.slice(0, 3),
                        (leaf.stroke.color[3] ?? 255) * alpha,
                      ],
                    }
                  : null,
                glyphs: leaf.glyphs?.map((g) => ({
                  ...g,
                  color: [...g.color.slice(0, 3), (g.color[3] ?? 255) * alpha],
                })),
              };
            });
          }),
      };
    }),
  },
};
const detailList = list(865),
  detailFields = detailList
    .filter((p) => symbols.editTexts.some((t) => t.id === p.charId))
    .map(field);
const details = {
  symbol: 865,
  origin: creator.find((p) => p.name === 'Details_mc')!.matrix,
  bounds: rect(865),
  static: detailList
    .filter((p) => !p.name && !p.clipDepth)
    .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix)),
  fields: detailFields,
  viewer: { matrix: detailList.find((p) => p.name === 'Viewer_mc')!.matrix, mask: rect(862) },
  arrow: { ...piece(detailList.find((p) => p.name === 'Arrow_mc')!), mask: rect(856) },
};
const infoList = list(1000),
  infoFields = infoList.filter((p) => symbols.editTexts.some((t) => t.id === p.charId)).map(field);
const selectionInfo = {
  icon: { symbol: 1002, bounds: rect(1002) },
  popup: {
    symbol: 1000,
    bounds: rect(1000),
    fields: infoFields,
    static: infoList
      .filter((p) => !p.name)
      .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix)),
  },
};
const fonts = Object.fromEntries(
  [
    ...new Set(
      [
        ...statsFields,
        ...rowFields,
        caption,
        ...advancedFields,
        ...confirmFields,
        ...detailFields,
        ...infoFields,
      ].map((f) => f.fontId),
    ),
  ].map((id) => {
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
  advanced,
  details,
  selectionInfo,
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
