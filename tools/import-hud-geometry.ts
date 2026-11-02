/** Numerical HUD layout and device-text metrics only; artwork stays in the supplied SWF. */
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
  return [...depths.values()] as ((typeof symbols.sprites)[number]['placements'][number] & {
    charId: number;
    matrix: NonNullable<(typeof symbols.sprites)[number]['placements'][number]['matrix']>;
  })[];
}
function bounds(id: number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const leaf = [...symbols.shapes, ...symbols.texts, ...symbols.editTexts].find((s) => s.id === id);
  if (leaf?.bounds) return leaf.bounds;
  const morph = symbols.morphs.find((s) => s.id === id);
  if (morph) return morph.startBounds;
  const points = list(id).flatMap((p) => {
    const b = bounds(p.charId),
      m = p.matrix;
    return [b.xMin, b.xMax].flatMap((x) =>
      [b.yMin, b.yMax].map((y) => ({
        x: x * m.a + y * m.c + m.tx,
        y: x * m.b + y * m.d + m.ty,
      })),
    );
  });
  return {
    xMin: Math.min(...points.map((p) => p.x)),
    xMax: Math.max(...points.map((p) => p.x)),
    yMin: Math.min(...points.map((p) => p.y)),
    yMax: Math.max(...points.map((p) => p.y)),
  };
}
function geometry(symbol: number) {
  const b = bounds(symbol);
  return {
    symbol,
    frames: sprites.get(symbol)!.frameCount,
    bounds: {
      x: b.xMin / 20,
      y: b.yMin / 20,
      width: (b.xMax - b.xMin) / 20,
      height: (b.yMax - b.yMin) / 20,
    },
  };
}
function layout(id: number, frame = 1) {
  const placements = list(id, frame);
  const height = (secondaryY?: number) => {
    const ys = placements.flatMap((p) => {
      const b = bounds(p.charId),
        m = p.matrix;
      const ty = p.name === 'Secondary_mc' && secondaryY !== undefined ? secondaryY * 20 : m.ty;
      return [b.xMin, b.xMax].flatMap((x) =>
        [b.yMin, b.yMax].map((y) => (x * m.b + y * m.d + ty) / 20),
      );
    });
    return Math.max(...ys) - Math.min(...ys);
  };
  return {
    labels: placements
      .filter((p) => symbols.editTexts.some((t) => t.id === p.charId))
      .map((p) => ({
        name: p.name,
        id: p.charId,
        x: p.matrix.tx / 20,
        y: p.matrix.ty / 20,
      })),
    // Alpha-zero Secondary_mc still contributes to DisplayObject.height in Flash.
    height: height(),
    secondaryHeight: height(42.45 + 15.4 * (frame - 1)),
  };
}
const avatar = list(1534);
function widget(name: string) {
  const p = avatar.find((p) => p.name === name)!;
  return {
    symbol: p.charId,
    x: p.matrix.tx / 20,
    y: p.matrix.ty / 20,
    scaleX: p.matrix.a,
    alpha: p.color?.mult[3] ?? 1,
  };
}
const life = widget('life_mc'),
  fire = widget('fireRate_mc');
const edit = widget('edit_mc');
const editModes = [
  { frame: 2, y: 124, speed: 40 },
  { frame: 3, y: 304, speed: 65 },
  { frame: 1, y: 54, speed: 40 },
].map((mode) => {
  const ps = list(edit.symbol, mode.frame);
  const corners = ps.flatMap((p) => {
    const b = bounds(p.charId),
      m = p.matrix;
    return [b.xMin, b.xMax].flatMap((x) =>
      [b.yMin, b.yMax].map((y) => ({
        x: (x * m.a + y * m.c + m.tx) / 20,
        y: (x * m.b + y * m.d + m.ty) / 20,
      })),
    );
  });
  const x = Math.min(...corners.map((p) => p.x)),
    y = Math.min(...corners.map((p) => p.y));
  return {
    ...mode,
    bounds: {
      x,
      y,
      width: Math.max(...corners.map((p) => p.x)) - x,
      height: Math.max(...corners.map((p) => p.y)) - y,
    },
  };
});
const confirm = list(1935, 4)
  .filter((p) => p.depth >= 2 && p.depth <= 8)
  .map((p) => {
    const b = bounds(p.charId);
    return {
      symbol: p.charId,
      name: p.name ?? '',
      x: p.matrix.tx / 20,
      y: p.matrix.ty / 20,
      bounds: {
        x: b.xMin / 20,
        y: b.yMin / 20,
        width: (b.xMax - b.xMin) / 20,
        height: (b.yMax - b.yMin) / 20,
      },
    };
  });
const helpBounds = bounds(1876);
const helpOrigin = {
  x: (550 - (helpBounds.xMax - helpBounds.xMin) / 20) / 2,
  y: (450 - (helpBounds.yMax - helpBounds.yMin) / 20) / 2,
};
const secondaryHelp = list(1876).map((p) => {
  const b = bounds(p.charId);
  return {
    symbol: p.charId,
    name: p.name ?? '',
    x: helpOrigin.x + p.matrix.tx / 20,
    y: helpOrigin.y + p.matrix.ty / 20,
    bounds: {
      x: b.xMin / 20,
      y: b.yMin / 20,
      width: (b.xMax - b.xMin) / 20,
      height: (b.yMax - b.yMin) / 20,
    },
  };
});
const pausePieces = list(1636);
const pauseShade = pausePieces.find((piece) => piece.charId === 1096)!;
const shadeShape = symbols.shapes.find((shape) => shape.id === pauseShade.charId) as unknown as {
  fills: { kind: string; color: number[] }[];
};
if (shadeShape.fills.length !== 1 || shadeShape.fills[0].kind !== 'solid')
  throw new Error('Pause shade is not the expected flat solid rectangle');
const shadeBounds = bounds(pauseShade.charId);
const caption = symbols.editTexts.find((text) => text.id === 1560)!;
const captionFont = symbols.fonts.find((font) => font.id === caption.fontId)!;
if (captionFont.ascent === undefined) throw new Error('Pause caption font has no ascent metric');
const pause = {
  shade: {
    symbol: pauseShade.charId,
    depth: pauseShade.depth,
    matrix: pauseShade.matrix,
    bounds: {
      x: shadeBounds.xMin / 20,
      y: shadeBounds.yMin / 20,
      width: (shadeBounds.xMax - shadeBounds.xMin) / 20,
      height: (shadeBounds.yMax - shadeBounds.yMin) / 20,
    },
    color: shadeShape.fills[0].color,
  },
  caption: {
    size: caption.fontHeight / 20,
    font: captionFont.name.replace(/\0/g, ''),
    fontId: caption.fontId,
    ascent: captionFont.ascent / 20,
    align: caption.align,
  },
  root: list(1559).map((piece) => {
    const text = symbols.texts.find((text) => text.id === piece.charId)!;
    let fontId = 0,
      x = 0,
      y = 0,
      height = 0;
    let color = [0, 0, 0];
    return {
      symbol: piece.charId,
      name: '',
      depth: piece.depth,
      matrix: piece.matrix,
      textMatrix: text.matrix,
      glyphs: text.records.flatMap((record) => {
        fontId = record.fontId ?? fontId;
        x = record.x ?? x;
        y = record.y ?? y;
        height = record.height ?? height;
        color = record.color ?? color;
        const font = symbols.fonts.find((font) => font.id === fontId)!;
        return record.glyphs.map((glyph) => {
          const result = {
            text: String.fromCharCode(font.codeTable[glyph.index]),
            x: x / 20,
            y: y / 20,
            size: height / 20,
            font: font.name.replace(/\0/g, ''),
            color,
          };
          x += glyph.advance;
          return result;
        });
      }),
    };
  }),
  out: Object.fromEntries(
    pausePieces
      .filter((p) => p.charId === 439)
      .map((p) => [p.name!, { x: p.matrix.tx / 20, y: p.matrix.ty / 20 }]),
  ),
  pieces: pausePieces
    .filter((p) =>
      [
        'Paused_mc',
        'btnPlay_mc',
        'btnSettings_mc',
        'btn3_mc',
        'btn5_mc',
        'btnPlayMoreGames_mc',
        'rollover_txt',
      ].includes(p.name ?? ''),
    )
    .map((p) => {
      const b = bounds(p.charId);
      return {
        name: p.name!,
        symbol: p.charId,
        x: p.matrix.tx / 20,
        y: p.matrix.ty / 20,
        scaleX: p.matrix.a,
        scaleY: p.matrix.d,
        bounds: {
          x: b.xMin / 20,
          y: b.yMin / 20,
          width: (b.xMax - b.xMin) / 20,
          height: (b.yMax - b.yMin) / 20,
        },
      };
    }),
};
const infoPieces = list(1609);
const tankInfo = {
  out: Object.fromEntries(
    infoPieces
      .filter((p) => p.charId === 439)
      .map((p) => [p.name!, { x: p.matrix.tx / 20, y: p.matrix.ty / 20 }]),
  ),
  pieces: infoPieces
    .filter((p) => p.charId !== 439)
    .map((p) => {
      const b = bounds(p.charId);
      return {
        symbol: p.charId,
        name: p.name!,
        x: p.matrix.tx / 20,
        y: p.matrix.ty / 20,
        bounds: {
          x: b.xMin / 20,
          y: b.yMin / 20,
          width: (b.xMax - b.xMin) / 20,
          height: (b.yMax - b.yMin) / 20,
        },
        fields: list(p.charId).flatMap((child) => {
          const text = symbols.editTexts.find((text) => text.id === child.charId);
          return text
            ? [
                {
                  name: child.name!,
                  x: (child.matrix.tx + text.bounds.xMin) / 20,
                  y: (child.matrix.ty + text.bounds.yMin) / 20,
                  width: (text.bounds.xMax - text.bounds.xMin) / 20,
                  height: (text.bounds.yMax - text.bounds.yMin) / 20,
                  size: text.fontHeight / 20,
                  ascent: (symbols.fonts.find((f) => f.id === text.fontId)?.ascent ?? 20480) / 20,
                },
              ]
            : [];
        }),
      };
    }),
};
const texts = Object.fromEntries(
  symbols.editTexts
    .filter((t) => t.id >= 1436 && t.id <= 1506)
    .map((t) => [
      t.id,
      {
        bounds: t.bounds,
        size: t.fontHeight / 20,
        right: t.align === 1,
        spacing: Number(t.text.match(/letterSpacing="([^"]+)"/)?.[1] ?? 0),
      },
    ]),
);
await writeFile(
  'src/game/data/hud-geometry.json',
  JSON.stringify({
    life: { ...life, layout: layout(life.symbol) },
    edit: { ...edit, modes: editModes },
    editConfirm: confirm,
    secondaryHelp,
    tankInfo,
    pause,
    tactical: {
      radar: geometry(116),
      enemyLife: geometry(1999),
      allyLife: geometry(2194),
    },
    fire: {
      ...fire,
      layouts: Array.from({ length: sprites.get(fire.symbol)!.frameCount }, (_, i) =>
        layout(fire.symbol, i + 1),
      ),
    },
    secondary: layout(1443),
    texts,
  }) + '\n',
);
console.log('Imported authored life HUD and nine weapon HUD layouts.');
