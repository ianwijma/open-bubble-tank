/** Local TankViewer1413 numeric geometry only. Artwork stays in the user supplied SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { createSwfLayout } from './lib/swf-layout';
import type { SymbolResult, DisplayPlacement } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const layout = createSwfLayout(symbols);
// Shape1406 combines local and server callout backgrounds in separate filled runs.
// Keep source geometry at runtime, but clip away the retired upper server region.
const guideRegions = (() => {
  const shape = symbols.shapes.find((s) => s.id === 1406)! as unknown as {
    runs: { start: number[]; ops: (string | number)[][] }[];
  };
  const regions = shape.runs.map((run) => {
    const points = [
      run.start,
      ...run.ops.flatMap((op) => {
        const result: number[][] = [];
        for (let i = 1; i < op.length; i += 2) result.push([Number(op[i]), Number(op[i + 1])]);
        return result;
      }),
    ];
    const x = Math.min(...points.map((p) => p[0])) / 20,
      y = Math.min(...points.map((p) => p[1])) / 20;
    return {
      x,
      y,
      width: Math.max(...points.map((p) => p[0])) / 20 - x,
      height: Math.max(...points.map((p) => p[1])) / 20 - y,
    };
  });
  const remote = symbols.texts.find((t) => t.id === 1409)!;
  const placement = buildDisplayList(
    symbols.sprites.find((s) => s.id === 1412)!,
    2,
  ).find((p) => p.charId === 1409)!;
  const remoteBottom = (remote.bounds.yMax + placement.matrix.ty) / 20;
  return regions.filter((r) => r.y > remoteBottom);
})();
const guideLocalClip = {
  x: Math.min(...guideRegions.map((r) => r.x)),
  y: Math.min(...guideRegions.map((r) => r.y)),
  width:
    Math.max(...guideRegions.map((r) => r.x + r.width)) - Math.min(...guideRegions.map((r) => r.x)),
  height:
    Math.max(...guideRegions.map((r) => r.y + r.height)) -
    Math.min(...guideRegions.map((r) => r.y)),
};
const list = (id: number, frame = 1) =>
  buildDisplayList(
    symbols.sprites.find((s) => s.id === id)!,
    frame,
  );
function fieldsFor(placements: DisplayPlacement[]) {
  return placements.flatMap((p) => {
    const t = symbols.editTexts.find((t) => t.id === p.charId);
    if (!t) return [];
    const font = symbols.fonts.find((f) => f.id === t.fontId)!;
    const size = t.fontHeight / 20,
      ascent = (font.ascent ?? 20480) / 20,
      descent = (font.descent ?? 0) / 20;
    return [
      {
        matrix: p.matrix,
        name: p.name ?? `text${p.charId}`,
        symbol: p.charId,
        initialText: t.text
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(
            /&(nbsp|apos|quot|amp|lt|gt);/g,
            (_, key) =>
              (
                ({ nbsp: ' ', apos: "'", quot: '"', amp: '&', lt: '<', gt: '>' }) as Record<
                  string,
                  string
                >
              )[key] ?? '',
          )
          .trimEnd(),
        x: t.bounds.xMin / 20,
        y: t.bounds.yMin / 20,
        width: (t.bounds.xMax - t.bounds.xMin) / 20,
        height: (t.bounds.yMax - t.bounds.yMin) / 20,
        fontId: font.id,
        font: font.name.replaceAll('\0', ''),
        size,
        ascent,
        lineHeight: ((ascent + descent) * size) / 1024 + (t.leading ?? 0) / 20,
        color: t.color ?? [255, 255, 255, 255],
        align: t.align ?? 0,
        spacing: Number(t.text.match(/letterSpacing="([\d.-]+)"/)?.[1] ?? 0),
        bold: !!font.bold,
        italic: !!font.italic,
        wordWrap: !!t.flags?.wordWrap,
        deviceFont: !t.flags?.useOutlines,
        maxLength: t.maxLength,
        advances: Object.fromEntries(
          font.codeTable.map((c, i) => [
            String.fromCharCode(c),
            (font.advances?.[i] ?? 10240) / 20,
          ]),
        ),
      },
    ];
  });
}

function piece(p: DisplayPlacement) {
  const leaves = layout.collect(p.charId, 1, 'up');
  const fields = fieldsFor(symbols.sprites.some((s) => s.id === p.charId) ? list(p.charId) : []);
  const bounds = layout.bounds([
    ...leaves,
    ...fields.map((f) => ({
      bounds: {
        xMin: f.x * 20,
        xMax: (f.x + f.width) * 20,
        yMin: f.y * 20,
        yMax: (f.y + f.height) * 20,
      },
      matrix: f.matrix,
    })),
  ]);
  return { name: p.name ?? '', symbol: p.charId, matrix: p.matrix, bounds };
}
function withFont(p: ReturnType<typeof layout.collect>[number]) {
  if (p.kind !== 'text') return p;
  const text = symbols.texts.find((t) => t.id === p.id)!;
  const font = symbols.fonts.find((f) => f.id === text.records.find((r) => r.fontId)?.fontId)!;
  return { ...p, font: font.name.replaceAll('\0', ''), bold: !!font.bold, italic: !!font.italic };
}
function widget(id: number, frame = 1, omit: number[] = []) {
  const ps = list(id, frame).filter((p) => !omit.includes(p.charId)),
    fields = fieldsFor(ps);
  const staticPlacements = ps.filter(
    (p) => !p.name && p.clipDepth === undefined && !fields.some((f) => f.symbol === p.charId),
  );
  const art = staticPlacements
    .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix))
    .flatMap((p) =>
      id === 1412 && frame === 2 && p.id === 1406
        ? guideRegions.map((r) => ({
            ...p,
            bounds: {
              xMin: r.x * 20,
              yMin: r.y * 20,
              xMax: (r.x + r.width) * 20,
              yMax: (r.y + r.height) * 20,
            },
          }))
        : [p],
    )
    .map((p) => {
      if (id === 1115 && p.id === 1111) {
        // Keep only the largest reverse-fill region's numeric bounds for the mock triangle hole.
        const shape = symbols.shapes.find((s) => s.id === 1111)! as unknown as {
          runs: { f0: number; f1: number; start: number[]; ops: (string | number)[][] }[];
        };
        const holes = shape.runs
          .filter((r) => !r.f0 && r.f1)
          .map((r) => {
            const points = [
              r.start,
              ...r.ops.flatMap((op) => {
                const ps: number[][] = [];
                for (let i = 1; i < op.length; i += 2) ps.push([Number(op[i]), Number(op[i + 1])]);
                return ps;
              }),
            ];
            return {
              xMin: Math.min(...points.map((p) => p[0])),
              xMax: Math.max(...points.map((p) => p[0])),
              yMin: Math.min(...points.map((p) => p[1])),
              yMax: Math.max(...points.map((p) => p[1])),
            };
          })
          .sort(
            (a, b) => (b.xMax - b.xMin) * (b.yMax - b.yMin) - (a.xMax - a.xMin) * (a.yMax - a.yMin),
          );
        return { ...p, kind: 'warning-triangle', innerBounds: holes[0] };
      }
      if (id === 1115 && p.id === 1113) return { ...p, kind: 'warning-mark' };
      if (id === 1412 && p.id === 1410) return { ...p, kind: 'right-arrow' };
      return withFont(p);
    });
  return {
    symbol: id,
    frame,
    fields,
    staticDepths: [...staticPlacements, ...ps.filter((p) => p.clipDepth !== undefined)].map(
      (p) => p.depth,
    ),
    art,
    children: ps.filter((p) => p.name && !fields.some((f) => f.symbol === p.charId)).map(piece),
    ...(id === 1412 && frame === 2 ? { clips: [{ symbol: 1406, bounds: guideLocalClip }] } : {}),
  };
}
const base = widget(1413),
  row = widget(1176),
  rowButtons = widget(1116),
  detail = widget(1169);
const ids = new Set(
  [...base.children, ...row.children, ...rowButtons.children, ...detail.children]
    .filter((p) => p.name.startsWith('btn'))
    .map((p) => p.symbol),
);
const widgets = [
  base,
  row,
  rowButtons,
  detail,
  widget(1173),
  widget(1115), // TankLoadingBox's runtime-faded CautionSign_mc.
  widget(1137, 1),
  widget(1137, 2),
  widget(1403, 1),
  widget(1403, 2),
  widget(1386, 4),
  widget(1390),
  widget(1431),
  widget(1412, 1),
  // The offline guide retains local help; the retired server-search arrow/copy is omitted.
  widget(1412, 2, [1407, 1408, 1409]),
];
for (const frame of [1, 2])
  for (const p of list(1137, frame))
    if (p.name === 'textBoxes_mc' && !widgets.some((w) => w.symbol === p.charId))
      widgets.push(widget(p.charId));
for (const w of [...widgets])
  for (const p of w.children)
    if (p.name.startsWith('btn') || ['next_mc', 'back_mc'].includes(p.name)) ids.add(p.symbol);
// Source sort panel's open endpoint; its motion remains represented by its numeric authored frames.
for (const id of [1218, 1222])
  for (let frame = 1; frame <= 10; frame++) widgets.push(widget(id, frame));
for (const w of widgets.filter((w) => w.symbol === 1222))
  for (const p of w.children) ids.add(p.symbol);
ids.add(1221);
ids.add(1224);
for (const id of ids) {
  const count = symbols.sprites.find((s) => s.id === id)?.frameCount ?? 1;
  for (let frame = 1; frame <= Math.min(5, count); frame++)
    if (!widgets.some((w) => w.symbol === id && w.frame === frame)) widgets.push(widget(id, frame));
}
const data = {
  symbol: 1413,
  widgets,
  root: base.children,
  fields: base.fields,
  guideNote: (() => {
    const p = list(1412, 2).find((p) => p.charId === 1407)!,
      t = symbols.texts.find((t) => t.id === p.charId)!,
      record = t.records.find((r) => r.fontId)!,
      font = symbols.fonts.find((f) => f.id === record.fontId)!,
      lines = [
        ...new Set(
          layout
            .collect(1407, 1, 'up')
            .flatMap((leaf) =>
              leaf.kind === 'text' ? leaf.glyphs.map((g: { y: number }) => g.y) : [],
            ),
        ),
      ].sort((a, b) => a - b);
    return {
      name: 'offlineGuide',
      symbol: 1407,
      matrix: p.matrix,
      x: t.bounds.xMin / 20,
      y: t.bounds.yMin / 20,
      width: (t.bounds.xMax - t.bounds.xMin) / 20,
      height: (t.bounds.yMax - t.bounds.yMin) / 20,
      fontId: font.id,
      font: font.name.replaceAll('\0', ''),
      size: record.height! / 20,
      ascent: (font.ascent ?? 20480) / 20,
      lineHeight: lines[1] - lines[0],
      color: record.color ?? [255, 255, 255],
      align: 2,
      spacing: 0,
      bold: !!font.bold,
      italic: !!font.italic,
      wordWrap: true,
      advances: Object.fromEntries(
        font.codeTable.map((c, i) => [String.fromCharCode(c), (font.advances?.[i] ?? 10240) / 20]),
      ),
    };
  })(),
  rowBounds: layout.bounds(layout.collect(1176, 1, 'up')),
  mask: layout.bounds(layout.collect(1085, 1, 'up')),
  helper: layout.bounds(layout.collect(439, 1, 'up')),
  sortButtonBounds: layout.bounds(
    list(1225)
      .filter((p) => !p.name)
      .flatMap((p) => layout.collect(p.charId, 5, 'up', p.matrix)),
  ),
  sortIconMatrix: list(1225).find((p) => p.charId === 1221)!.matrix,
  statistics: {
    background: {
      bounds: layout.bounds(layout.collect(1120, 1, 'up')),
      stops: (
        symbols.shapes.find((s) => s.id === 1120)! as unknown as {
          fills: { stops: { ratio: number; color: number[] }[] }[];
        }
      ).fills[0].stops,
    },
    closed: layout.bounds(layout.collect(1119, 1, 'up')),
    frames: Array.from({ length: 10 }, (_, i) => ({
      age: i + 1,
      mask: layout.bounds(
        layout.collect(1136, i + 1, 'up', list(1137, 2).find((p) => p.name === 'Mask_mc')!.matrix),
      ),
    })),
  },
  rejection: await (async () => {
    const symbol = 1557,
      placements = list(symbol),
      sprite = symbols.sprites.find((s) => s.id === symbol)!;
    const source = await readFile(
      `${root}/re/bt3/export_scripts_deobf/scripts/TankViewerScreen.as`,
      'utf8',
    );
    const origin = source.match(/CreateEffect\(new _-4k\(\),(\d+),(\d+),"mainEffects"\)/)!;
    if (!origin) throw new Error('Cannot locate the viewer rejection effect origin.');
    return {
      symbol,
      x: Number(origin[1]),
      y: Number(origin[2]),
      frameCount: sprite.frameCount,
      fields: fieldsFor(placements),
      fieldIndex: placements.findIndex((p) => p.name === 'txtErrorOutputText_txt'),
      pieces: placements
        .filter((p) => !p.name)
        .map((p) => ({
          symbol: p.charId,
          index: placements.indexOf(p),
          matrix: p.matrix,
          art: layout.collect(p.charId, 1, 'up').map(withFont),
        })),
      frames: Array.from({ length: sprite.frameCount }, (_, i) => {
        const ps = list(symbol, i + 1);
        if (
          ps.length !== placements.length ||
          ps.some(
            (p, j) =>
              p.charId !== placements[j].charId ||
              JSON.stringify(p.matrix) !== JSON.stringify(placements[j].matrix) ||
              (p.color &&
                (p.color.mult.slice(0, 3).some((v) => v !== 1) ||
                  p.color.add.some((v) => v !== 0))),
          )
        )
          throw new Error('Viewer rejection has unsupported placement/color motion.');
        return ps.map((p) => p.color?.mult[3] ?? 1);
      }),
    };
  })(),
};
await writeFile('src/game/data/tank-viewer.json', JSON.stringify(data) + '\n');
console.log(`Imported ${widgets.length} viewer poses without artwork.`);
