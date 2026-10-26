/** Import only numeric projectile geometry/palette facts, never vector paths or media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import type { SpriteInfo } from '../src/game/assets/asset-pack';
import art from '../src/game/data/projectile-art.json';
import mines from '../src/game/data/mine-art.json';

interface Rect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
interface Style {
  color?: number[];
  start?: number[];
  end?: number[];
  stops?: Style[];
  fill?: Style;
  width?: number;
  startWidth?: number;
  endWidth?: number;
}
interface Shape {
  id: number;
  bounds?: Rect;
  startBounds?: Rect;
  endBounds?: Rect;
  fills: Style[];
  lines: Style[];
}
function palette(styles: Style[], end = false) {
  const colors: number[][] = [];
  function visit(style: Style) {
    const color = (end ? style.end : style.start) ?? style.color;
    if (color) colors.push([...color.slice(0, 3), color[3] ?? 255]);
    for (const stop of style.stops ?? []) visit(stop);
    if (style.fill) visit(style.fill);
  }
  for (const style of styles) visit(style);
  // Preserve opaque colored gradient stops rather than choosing the white highlight.
  return colors.sort(
    (a, b) =>
      b[3] - a[3] ||
      Math.max(...b.slice(0, 3)) -
        Math.min(...b.slice(0, 3)) -
        (Math.max(...a.slice(0, 3)) - Math.min(...a.slice(0, 3))),
  )[0];
}
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const movie = await extractSymbols(bytes, { svg: false });
const sprites = new Map<number, SpriteInfo>(
  movie.symbols.sprites.map((s: SpriteInfo) => [s.id, s]),
);
const shapes = new Map<number, Shape>(
  [...movie.symbols.shapes, ...movie.symbols.morphs].map((s: Shape) => [s.id, s]),
);
const roots = [
  ...new Set([
    ...Object.values(art).map((entry) => entry.symbol),
    ...Object.values(mines).map((entry) => entry.symbol),
    1717,
    1721,
    15,
  ]),
].sort((a, b) => a - b);
const selected = new Set<number>();
function visit(id: number) {
  if (selected.has(id)) return;
  if (!sprites.has(id) && !shapes.has(id))
    throw new Error(`Unsupported projectile geometry leaf ${id}`);
  selected.add(id);
  for (const placement of sprites.get(id)?.placements ?? [])
    if (placement.charId !== undefined) visit(placement.charId);
}
for (const id of roots) visit(id);
const entries = [...selected].sort((a, b) => a - b);
await writeFile(
  'src/game/data/projectile-geometry.json',
  JSON.stringify({
    roots,
    sprites: Object.fromEntries(
      entries
        .filter((id) => sprites.has(id))
        .map((id) => {
          const sprite = sprites.get(id)!;
          return [
            id,
            {
              id,
              frameCount: sprite.frameCount,
              placements: sprite.placements.map(
                ({ depth, charId, matrix, color, frame, remove, clipDepth, name, ratio }) => ({
                  depth,
                  charId,
                  matrix,
                  color,
                  frame,
                  remove,
                  clipDepth,
                  name,
                  ratio,
                }),
              ),
            },
          ];
        }),
    ),
    shapes: Object.fromEntries(
      entries
        .filter((id) => shapes.has(id))
        .map((id) => {
          const shape = shapes.get(id)!;
          return [
            id,
            {
              bounds: shape.bounds,
              startBounds: shape.startBounds,
              endBounds: shape.endBounds,
              fill: palette(shape.fills),
              line: palette(shape.lines),
              endFill: shape.endBounds ? palette(shape.fills, true) : undefined,
              endLine: shape.endBounds ? palette(shape.lines, true) : undefined,
              lineWidth:
                Math.max(0, ...shape.lines.map((line) => line.width ?? line.startWidth ?? 0)) / 20,
              endLineWidth: shape.endBounds
                ? Math.max(0, ...shape.lines.map((line) => line.endWidth ?? line.startWidth ?? 0)) /
                  20
                : undefined,
            },
          ];
        }),
    ),
  }) + '\n',
);
console.log(
  `Imported ${roots.length} projectile roots, ${entries.filter((id) => sprites.has(id)).length} sprites and ${entries.filter((id) => shapes.has(id)).length} numeric leaves.`,
);
