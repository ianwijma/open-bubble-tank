/** Recover numeric bubble layouts for procedural parts; never import paths or media. */
import { readFile, writeFile } from 'node:fs/promises';
import { decompressSWF } from '../src/game/assets/swf.mjs';
import { extractSymbols } from '../src/game/assets/swf-symbols.mjs';
import { buildDisplayList } from '../src/game/assets/display-list';
import type { SpriteInfo, SwfMatrix } from '../src/game/assets/asset-pack';
import { PARTS } from '../src/game/data/catalog';

type Rect = { xMin: number; xMax: number; yMin: number; yMax: number };
type Shape = {
  id: number;
  bounds: Rect;
  edgeBounds?: Rect;
  lines: { width: number }[];
};
const root = process.argv[2] ?? '../documented-bubble-tank-3';
const { bytes } = await decompressSWF(
  new Uint8Array(await readFile(`${root}/re/bt3/uncompressed.swf`)),
);
const { symbols } = await extractSymbols(bytes, { svg: false });
const sprites = new Map<number, SpriteInfo>(symbols.sprites.map((s: SpriteInfo) => [s.id, s]));
const shapes = new Map<number, Shape>(symbols.shapes.map((s: Shape) => [s.id, s]));
const identity: SwfMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
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

// Manual, source-backed decomposition of compound DefineShapes into circles.
// Centers/radii are twips read from their white outline's quadratic extrema:
// 698/699 = rotating machine gun poses, 1822 = Shield, 1824 = Seekers.
// These retain the bubble arrangement, not the original vector contours/glints.
const compounds: Record<number, number[][]> = {
  698: [
    [178, -140, 68],
    [178, 124, 68],
    [276, -114, 68],
    [276, 106, 68],
    [359, -48, 68],
    [359, 54, 68],
    [466, 9, 100],
    [46, -14, 206],
  ],
  699: [
    [318, -140, 68],
    [318, 124, 68],
    [416, -114, 68],
    [416, 106, 68],
    [499, -49, 68],
    [499, 55, 68],
    [606, 9, 100],
    [186, -14, 206],
  ],
  1822: [
    [163, -135, 80],
    [153, 150, 80],
    [-153, -150, 80],
    [-163, 135, 80],
    [3, -1, 130],
  ],
  1824: [
    [105, -143, 80],
    [95, 142, 80],
    [-55, -9, 130],
  ],
};
const circular = new Set([14, 21, 33, 41, 694, 718, 719, 2449]);
function recover(part: { id: number; symbol: number }, chargeFrame?: number, matrix = identity) {
  // effect_Massive_Bullet_94.frame1 stops720 on its empty first frame.
  // A blind frame2 snapshot includes its charging particles around the idle gun.
  // _-KE.frame1 also stops Rotating Machine Gun701 before its alternate frame2.
  const frame = part.id === 3008 || part.id === 4015 ? 1 : 2;
  const bubbles: {
    leaf: number;
    matrix: SwfMatrix;
    x: number;
    y: number;
    rx: number;
    ry: number;
    lineWidth: number;
    alpha: number;
    tint: number[];
    accent: boolean;
  }[] = [];
  const xs: number[] = [],
    ys: number[] = [];
  function visit(id: number, matrix: SwfMatrix, alpha = 1, mult = 1, add = 0, depth = 0) {
    if (depth > 12) throw new Error(`Part ${part.id}: recursive sprite ${id}`);
    const shape = shapes.get(id);
    if (shape) {
      const b = shape.bounds;
      for (const x of [b.xMin, b.xMax])
        for (const y of [b.yMin, b.yMax]) {
          xs.push((matrix.a * x + matrix.c * y + matrix.tx) / 20);
          ys.push((matrix.b * x + matrix.d * y + matrix.ty) / 20);
        }
      // Invisible green muzzle markers affect Script bounds, but never the paint/hit mask.
      if (alpha <= 0) return;
      if (!compounds[id] && !circular.has(id)) throw new Error(`Unknown visible part leaf ${id}`);
      const edge = shape.edgeBounds ?? b;
      const circles = compounds[id] ?? [
        [
          (edge.xMin + edge.xMax) / 2,
          (edge.yMin + edge.yMax) / 2,
          (edge.xMax - edge.xMin) / 2,
          (edge.yMax - edge.yMin) / 2,
        ],
      ];
      for (const [x, y, rx, ry = rx] of circles)
        bubbles.push({
          leaf: id,
          matrix,
          x: x / 20,
          y: y / 20,
          rx: rx / 20,
          ry: ry / 20,
          lineWidth: Math.max(0, ...shape.lines.map((line) => line.width)) / 20,
          alpha,
          tint: [mult, add],
          accent: id === 14,
        });
      return;
    }
    const sprite = sprites.get(id);
    if (!sprite) throw new Error(`Unknown part symbol ${id}`);
    // Same frozen convention as creator thumbnails, except the stopped charge clip above.
    for (const p of buildDisplayList(sprite, id === 720 && chargeFrame ? chargeFrame : frame)) {
      if (p.clipDepth !== undefined || p.filters?.length || p.blendMode)
        throw new Error(`Part ${part.id}: unsupported compositing at ${id}/${p.depth}`);
      const color = p.color;
      if (
        color &&
        (color.mult.slice(0, 3).some((m) => m !== color.mult[0]) ||
          color.add.slice(0, 3).some((a) => a !== color.add[0]) ||
          color.add[3] !== 0)
      )
        throw new Error(`Part ${part.id}: unsupported color transform`);
      const childMult = mult * (color?.mult[0] ?? 1),
        childAdd = add + mult * (color?.add[0] ?? 0);
      // The shipped non-identity RGB transform is precisely mult113/256 +143.
      if (color && color.mult[0] !== 1 && (color.mult[0] !== 113 / 256 || color.add[0] !== 143))
        throw new Error(`Part ${part.id}: unrecognized pale-pellet transform`);
      visit(
        p.charId,
        multiply(matrix, p.matrix),
        alpha * (color?.mult[3] ?? 1),
        childMult,
        childAdd,
        depth + 1,
      );
    }
  }
  visit(part.symbol, matrix);
  const x = xs.length ? Math.min(...xs) : 0,
    y = ys.length ? Math.min(...ys) : 0;
  return [
    part.id,
    {
      symbol: part.symbol,
      frame: chargeFrame ?? frame,
      bounds: {
        x,
        y,
        width: xs.length ? Math.max(...xs) - x : 0,
        height: ys.length ? Math.max(...ys) - y : 0,
      },
      bubbles,
    },
  ];
}
const entries = PARTS.filter((p) => p.id >= 2000).map((part) => recover(part));
await writeFile(
  'src/game/data/part-geometry.json',
  JSON.stringify(Object.fromEntries(entries)) + '\n',
);
const massive = PARTS.find((p) => p.id === 3008)!;
const charge = buildDisplayList(sprites.get(massive.symbol)!, 1).find(
  (p) => p.name === 'bullet_mc',
)!;
await writeFile(
  'src/game/data/massive-charge-geometry.json',
  JSON.stringify(
    Array.from(
      { length: 26 },
      (_, i) => recover({ id: massive.id, symbol: charge.charId }, i + 2, charge.matrix)[1],
    ),
  ) + '\n',
);
console.log(
  `Imported ${entries.length} numeric gun/module idle layouts and26 Massive charge frames; no vector paths or media.`,
);
