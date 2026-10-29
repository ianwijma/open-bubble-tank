/** Repeatable numerical settings layouts. Original art remains in the user-supplied SWF. */
import { readFile, writeFile } from 'node:fs/promises';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
function list(id: number, frame = 1) {
  const depths = new Map<number, (typeof symbols.sprites)[number]['placements'][number]>();
  for (const p of sprites.get(id)!.placements) {
    if (p.frame > frame) break;
    if (p.remove) depths.delete(p.depth);
    else depths.set(p.depth, { ...depths.get(p.depth), ...p });
  }
  return [...depths.values()];
}
function bounds(id: number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const leaf = [...symbols.shapes, ...symbols.texts, ...symbols.editTexts].find((s) => s.id === id);
  if (leaf?.bounds) return leaf.bounds;
  const points = list(id).flatMap((p) => {
    const b = bounds(p.charId!),
      m = p.matrix!;
    return [b.xMin, b.xMax].flatMap((x) =>
      [b.yMin, b.yMax].map((y) => ({ x: x * m.a + y * m.c + m.tx, y: x * m.b + y * m.d + m.ty })),
    );
  });
  return {
    xMin: Math.min(...points.map((p) => p.x)),
    xMax: Math.max(...points.map((p) => p.x)),
    yMin: Math.min(...points.map((p) => p.y)),
    yMax: Math.max(...points.map((p) => p.y)),
  };
}
function element(p: ReturnType<typeof list>[number]) {
  const b = bounds(p.charId!),
    m = p.matrix!,
    text = symbols.editTexts.find((t) => t.id === p.charId);
  return {
    name: p.name ?? `depth${p.depth}`,
    symbol: p.charId!,
    x: m.tx / 20,
    y: m.ty / 20,
    scaleX: m.a,
    scaleY: m.d,
    bounds: {
      x: b.xMin / 20,
      y: b.yMin / 20,
      width: (b.xMax - b.xMin) / 20,
      height: (b.yMax - b.yMin) / 20,
    },
    frames: sprites.get(p.charId!)?.frameCount ?? 1,
    label: label(p.charId!),
    field: text
      ? {
          size: text.fontHeight / 20,
          align: text.align,
          font: text.fontId,
          ascent: (symbols.fonts.find((f) => f.id === text.fontId)?.ascent ?? 20480) / 20,
        }
      : null,
  };
}
function label(id: number): { text: string; size: number; font: string } | null {
  const text = symbols.texts.find((t) => t.id === id);
  if (!text) {
    const child =
      sprites.get(id) && list(id).find((p) => symbols.texts.some((t) => t.id === p.charId));
    return child ? label(child.charId!) : null;
  }
  let font = symbols.fonts[0],
    size = 12,
    copy = '';
  for (const record of text.records) {
    if (record.fontId) font = symbols.fonts.find((f) => f.id === record.fontId)!;
    if (record.height) size = record.height / 20;
    copy += record.glyphs.map((g) => String.fromCharCode(font.codeTable[g.index])).join('');
  }
  return { text: copy, size: size * text.matrix.d, font: font.name.replaceAll('\0', '') };
}
function panel(id: number, origin: { x: number; y: number }, frame = 1, grouped = false) {
  const placements = list(id, frame);
  return {
    origin,
    out: Object.fromEntries(
      placements
        .filter((p) => p.charId === 439)
        .map((p) => [p.name!, { x: p.matrix!.tx / 20, y: p.matrix!.ty / 20 }]),
    ),
    pieces: placements
      .filter((p) => p.charId !== 439)
      .map((p) => ({
        ...element(p),
        children:
          grouped && !['Title_mc', 'btnBack_mc', 'btnHotkeys_mc'].includes(p.name ?? '')
            ? list(p.charId!).map(element)
            : [],
      })),
  };
}
await writeFile(
  'src/game/data/settings-geometry.json',
  JSON.stringify({
    menu: { settings: panel(645, { x: 210, y: 90 }), hotkeys: panel(645, { x: 210, y: 90 }, 2) },
    pause: {
      settings: panel(1584, { x: 274.5, y: 224.5 }, 1, true),
      hotkeys: panel(1624, { x: 0, y: 0 }, 1, true),
    },
  }),
);
console.log('Imported main-menu frames and retained pause settings/hotkey geometry.');
