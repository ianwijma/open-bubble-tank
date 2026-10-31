/** Creator969 controls: placements, primitive bounds/colors and text advances only; no paths/media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import { buttonDisplayList, type ButtonState } from '../src/game/assets/button-display-list';
import type { SymbolResult, SwfMatrix } from '../src/game/assets/asset-pack';
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = (await extractSymbols(bytes, { svg: false })) as unknown as SymbolResult;
const sprites = new Map(symbols.sprites.map((s) => [s.id, s])),
  buttons = new Map(symbols.buttons!.map((s) => [s.id, s]));
const identity = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
function multiply(a: SwfMatrix, b: SwfMatrix): SwfMatrix {
  return {
    a: a.a * b.a + a.c * b.b,
    b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d,
    d: a.b * b.c + a.d * b.d,
    tx: a.a * b.tx + a.c * b.ty + a.tx,
    ty: a.b * b.tx + a.d * b.ty + a.ty,
  };
}
function collect(id: number, frame: number, state: ButtonState, matrix = identity): any[] {
  const shape = symbols.shapes.find((s) => s.id === id) as any;
  if (shape)
    return [
      {
        kind: id === 740 ? 'checked-box' : id === 929 || id === 930 ? 'arrow' : 'rect',
        id,
        matrix,
        bounds: shape.bounds,
        fill: shape.fills.find((f: any) => f.kind === 'solid')?.color ?? null,
        stroke: shape.lines[0]
          ? { color: shape.lines[0].color, width: shape.lines[0].width / 20 }
          : null,
      },
    ];
  const text = symbols.texts.find((t) => t.id === id);
  if (text) {
    let font = symbols.fonts[0],
      size = 12,
      x = 0,
      y = 0,
      color = [255, 255, 255, 255];
    const glyphs = text.records.flatMap((r) => {
      if (r.fontId) font = symbols.fonts.find((f) => f.id === r.fontId)!;
      if (r.height) size = r.height / 20;
      if (r.x !== undefined) x = r.x;
      if (r.y !== undefined) y = r.y;
      if (r.color) color = r.color;
      return r.glyphs.map((g) => {
        const glyph = {
          text: String.fromCharCode(font.codeTable[g.index]),
          x: x / 20,
          y: y / 20,
          size,
          color,
        };
        x += g.advance;
        return glyph;
      });
    });
    return [
      {
        kind: 'text',
        id,
        matrix: multiply(matrix, text.matrix),
        boundsMatrix: matrix,
        bounds: text.bounds,
        glyphs,
      },
    ];
  }
  const button = buttons.get(id),
    sprite = sprites.get(id);
  const placements = button
    ? buttonDisplayList(button, state)
    : sprite
      ? buildDisplayList(sprite, frame)
      : [];
  return placements.flatMap((p) => collect(p.charId, 1, state, multiply(matrix, p.matrix)));
}
function bounds(leaves: any[]) {
  const points = leaves.flatMap(({ bounds: b, matrix, boundsMatrix }) => {
    // DefineText's declared bounds already include its internal text matrix.
    const m = boundsMatrix ?? matrix;
    return [b.xMin / 20, b.xMax / 20].flatMap((x) =>
      [b.yMin / 20, b.yMax / 20].map((y) => ({
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
const names = [
  'SymmetricMode_mc',
  'LoadTank_mc',
  'SaveExit_mc',
  'Exit_mc',
  'DeleteButton_mc',
  'BringFront_mc',
  'SendBack_mc',
  'AlignCenter_mc',
  'Undo_mc',
  'Left_mc',
  'Right_mc',
];
const placements = buildDisplayList(sprites.get(969)!, 1);
const controls = names.map((name) => {
  const p = placements.find((p) => p.name === name)!;
  const variants = Object.fromEntries(
    [1, 2].flatMap((frame) =>
      (['up', 'over', 'down'] as const).map((state) => [
        `${frame}:${state}`,
        collect(p.charId, frame, state),
      ]),
    ),
  );
  return { name, symbol: p.charId, matrix: p.matrix, bounds: bounds(variants['1:up']), variants };
});
const sliders = ['Resize_mc', 'Rotate_mc'].map((name) => {
  const p = placements.find((p) => p.name === name)!,
    children = buildDisplayList(sprites.get(p.charId)!, 1),
    handle = children.find((p) => p.name)!;
  return {
    name,
    symbol: p.charId,
    matrix: p.matrix,
    track: children.filter((p) => !p.name).flatMap((p) => collect(p.charId, 1, 'up', p.matrix)),
    handle: {
      symbol: handle.charId,
      matrix: handle.matrix,
      variants: [collect(handle.charId, 1, 'up'), collect(handle.charId, 2, 'up')],
    },
  };
});
await writeFile(
  'src/game/data/creator-controls.json',
  JSON.stringify({
    symbol: 969,
    workspace: placements.find((p) => p.name === 'rings_mc')!.matrix,
    controls,
    sliders,
  }) + '\n',
);
console.log(
  `Imported ${controls.length} creator controls and ${sliders.length} transform sliders. No artwork.`,
);
