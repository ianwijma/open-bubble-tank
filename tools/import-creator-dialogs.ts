/** TankScreens1070 numerical layout. Original vectors/fonts/media stay in the supplied SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { createSwfLayout } from './lib/swf-layout';
import type { SymbolResult, DisplayPlacement } from '../src/game/assets/asset-pack';
import { buttonDisplayList } from '../src/game/assets/button-display-list';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const layout = createSwfLayout(symbols),
  sprite = symbols.sprites.find((s) => s.id === 1070)!;
function withFont(piece: ReturnType<typeof layout.collect>[number]) {
  if (piece.kind !== 'text') return piece;
  const text = symbols.texts.find((t) => t.id === piece.id)!,
    font = symbols.fonts.find((f) => f.id === text.records.find((r) => r.fontId)?.fontId)!;
  return {
    ...piece,
    font: font.name.replaceAll('\0', ''),
    bold: !!font.bold,
    italic: !!font.italic,
  };
}
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
        name: p.name ?? `text${p.charId}`,
        symbol: p.charId,
        initialText: t.text.replace(/<[^>]*>/g, ''),
        x: p.matrix.tx / 20 + t.bounds.xMin / 20,
        y: p.matrix.ty / 20 + t.bounds.yMin / 20,
        width: (t.bounds.xMax - t.bounds.xMin) / 20,
        height: (t.bounds.yMax - t.bounds.yMin) / 20,
        fontId: font.id,
        font: font.name.replaceAll('\0', ''),
        size,
        ascent,
        lineHeight: ((ascent + descent) * size) / 1024 + (t.leading ?? 0) / 20,
        color: t.color ?? [255, 255, 255, 255],
        align: t.align ?? 0,
        spacing: 0,
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
const frames = [1, 2, 3, 7].map((frame) => {
  const placements = buildDisplayList(sprite, frame);
  const fields = fieldsFor(placements);
  const buttons = placements
    .filter((p) => symbols.buttons?.some((b) => b.id === p.charId))
    .map((p) => {
      const button = symbols.buttons!.find((b) => b.id === p.charId)!;
      const fields = Object.fromEntries(
        (['up', 'over', 'down'] as const).map((state) => [
          state,
          fieldsFor(buttonDisplayList(button, state)),
        ]),
      );
      const up = fields.up;
      const bounds = layout.bounds([
        ...layout.collect(p.charId, 1, 'up'),
        ...up.map((f) => ({
          bounds: {
            xMin: f.x * 20,
            xMax: (f.x + f.width) * 20,
            yMin: f.y * 20,
            yMax: (f.y + f.height) * 20,
          },
          matrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
        })),
      ]);
      return {
        name: p.name!,
        symbol: p.charId,
        matrix: p.matrix,
        bounds,
        fields,
        variants: Object.fromEntries(
          ['up', 'over', 'down'].map((state) => [
            state,
            layout.collect(p.charId, 1, state as 'up'),
          ]),
        ),
      };
    });
  const staticIds = placements
    .filter((p) => !p.name && !fields.some((f) => f.symbol === p.charId))
    .map((p) => p.charId);
  return {
    frame,
    fields,
    buttons,
    staticIds,
    art: placements
      .filter((p) => staticIds.includes(p.charId))
      .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix))
      .flatMap((piece) => {
        if (piece.id !== 1013 && piece.id !== 1024) return [piece];
        // These authored shapes contain separate rectangular input/code boxes.
        // Retain only each rectangle's numeric bounds, never its original edge records.
        const shape = symbols.shapes.find((s) => s.id === piece.id)!;
        const runs = shape.runs as { start: [number, number]; ops: [string, ...number[]][] }[];
        return runs.map((run) => {
          const points = [run.start, ...run.ops.map((op) => op.slice(-2) as number[])];
          return {
            ...piece,
            bounds: {
              xMin: Math.min(...points.map((p) => p[0])),
              xMax: Math.max(...points.map((p) => p[0])),
              yMin: Math.min(...points.map((p) => p[1])),
              yMax: Math.max(...points.map((p) => p[1])),
            },
          };
        });
      })
      .map(withFont),
  };
});
const placement = buildDisplayList(
    symbols.sprites.find((s) => s.id === 969)!,
    1,
  ).find((p) => p.name === 'alert_mc')!,
  alertParts = buildDisplayList(
    symbols.sprites.find((s) => s.id === placement.charId)!,
    1,
  ),
  alertFields = fieldsFor(alertParts),
  staticIds = alertParts
    .filter((p) => !alertFields.some((f) => f.symbol === p.charId))
    .map((p) => p.charId),
  alert = {
    symbol: placement.charId,
    matrix: placement.matrix,
    fields: alertFields,
    staticIds,
    art: alertParts
      .filter((p) => staticIds.includes(p.charId))
      .flatMap((p) => layout.collect(p.charId, 1, 'up', p.matrix).map(withFont)),
  };
await writeFile(
  'src/game/data/creator-dialogs.json',
  JSON.stringify({ symbol: 1070, frames, alert }) + '\n',
);
console.log(
  `Imported ${frames.length} creator dialog frames and alert${alert.symbol} without artwork.`,
);
