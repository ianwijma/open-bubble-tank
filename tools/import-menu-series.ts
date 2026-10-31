/** Series524 timeline, glyph layout and procedural capsule/line facts. No media/contours. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF, iterTags, readHeader } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SymbolResult } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s]));
const reachable = new Set<number>();
function visit(id: number) {
  if (reachable.has(id)) return;
  reachable.add(id);
  for (const p of sprites.get(id)?.placements ?? []) if (p.charId !== undefined) visit(p.charId);
}
visit(524);
function bounds(id: number): { x: number; y: number; width: number; height: number } {
  const leaf = [...symbols.shapes, ...symbols.texts].find((s) => s.id === id);
  if (leaf?.bounds)
    return {
      x: leaf.bounds.xMin / 20,
      y: leaf.bounds.yMin / 20,
      width: (leaf.bounds.xMax - leaf.bounds.xMin) / 20,
      height: (leaf.bounds.yMax - leaf.bounds.yMin) / 20,
    };
  const points = buildDisplayList(sprites.get(id)!, 1).flatMap((p) => {
    const b = bounds(p.charId),
      m = p.matrix;
    return [b.x, b.x + b.width].flatMap((x) =>
      [b.y, b.y + b.height].map((y) => ({
        x: m.a * x + m.c * y + m.tx / 20,
        y: m.b * x + m.d * y + m.ty / 20,
      })),
    );
  });
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
const texts = symbols.texts
  .filter((t) => reachable.has(t.id))
  .map((t) => {
    let font = symbols.fonts[0],
      height = 240,
      x = 0,
      y = 0,
      color = [255, 255, 255, 255];
    const glyphs = t.records.flatMap((r) => {
      if (r.fontId) font = symbols.fonts.find((f) => f.id === r.fontId)!;
      if (r.height) height = r.height;
      if (r.x !== undefined) x = r.x;
      if (r.y !== undefined) y = r.y;
      if (r.color) color = r.color;
      return r.glyphs.map((g) => {
        const glyph = {
          text: String.fromCharCode(font.codeTable[g.index]),
          x: x / 20,
          y: y / 20,
          size: height / 20,
          color,
          font: font.name.replaceAll('\0', ''),
          bold: !!font.bold,
          italic: !!font.italic,
        };
        x += g.advance;
        return glyph;
      });
    });
    return { id: t.id, bounds: bounds(t.id), matrix: t.matrix, glyphs };
  });
const rootTag = [...iterTags(bytes, readHeader(bytes).tagsOffset)].find(
  (tag) =>
    tag.code === 39 &&
    new DataView(tag.body.buffer, tag.body.byteOffset).getUint16(0, true) === 524,
)!;
let frame = 1;
const labels: Record<string, number> = {};
for (const tag of iterTags(rootTag.body, 4)) {
  if (tag.code === 1) frame++;
  if (tag.code === 43) labels[new TextDecoder().decode(tag.body).split('\0')[0]] = frame;
}
type NumericShape = {
  id: number;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  startBounds: NumericShape['bounds'];
  endBounds: NumericShape['bounds'];
  fills: { color?: number[]; start?: number[] }[];
  lines: { color: number[] }[];
  runs: { start: number[] }[];
};
const numeric = symbols as unknown as { shapes: NumericShape[]; morphs: NumericShape[] };
const data = {
  symbol: 524,
  labels,
  sprites: [...sprites.values()]
    .filter((s) => reachable.has(s.id))
    .map(({ id, frameCount, placements }) => ({ id, frameCount, placements })),
  shapes: numeric.shapes
    .filter((s) => reachable.has(s.id))
    .map((s) => ({
      id: s.id,
      bounds: bounds(s.id),
      color: s.fills[0]?.color ?? s.lines[0]?.color ?? [0, 0, 0, 0],
      columns: s.fills.length ? [] : s.runs.map((r) => r.start[0] / 20),
    })),
  morphs: numeric.morphs
    .filter((s) => reachable.has(s.id))
    .map((s) => ({
      id: s.id,
      start: s.startBounds,
      end: s.endBounds,
      color: s.fills[0].start!,
    })),
  texts,
  controls: buildDisplayList(sprites.get(524)!, 10)
    .filter((p) => p.name)
    .map((p) => ({
      name: p.name!,
      symbol: p.charId,
      matrix: p.matrix,
      bounds: bounds(p.charId),
      depth: p.depth,
    })),
};
await writeFile('src/game/data/menu-series.json', JSON.stringify(data) + '\n');
console.log(
  'Imported series-link timelines, glyph positions and primitive paint facts. No artwork.',
);
