import { shapeHitGeometry } from './swf-symbols.mjs';

/** Canvas paths are geometry only: no painted alpha, glow or bitmap-cache effects. */
export class ShapeContact {
  private bounds: { xMin: number; yMin: number; xMax: number; yMax: number };
  private fills: { path: Path2D; rule: CanvasFillRule }[];
  private strokes: {
    path: Path2D;
    width: number;
    cap: CanvasLineCap;
    join: CanvasLineJoin;
    miter: number;
  }[];
  constructor(shape: Parameters<typeof shapeHitGeometry>[0]) {
    this.bounds = shape.bounds;
    const geometry = shapeHitGeometry(shape);
    this.fills = geometry.fills.map(({ path, rule }) => ({
      path: new Path2D(path),
      rule: rule as CanvasFillRule,
    }));
    this.strokes = geometry.strokes.map(({ path, width, cap, join, miter }) => ({
      path: new Path2D(path),
      width,
      cap: cap as CanvasLineCap,
      join: join as CanvasLineJoin,
      miter,
    }));
  }
  hit(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const b = this.bounds;
    if (x < b.xMin / 20 || x > b.xMax / 20 || y < b.yMin / 20 || y > b.yMax / 20) return false;
    if (this.fills.some((fill) => ctx.isPointInPath(fill.path, x, y, fill.rule))) return true;
    for (const stroke of this.strokes) {
      ctx.lineWidth = stroke.width || 1;
      ctx.lineCap = stroke.cap;
      ctx.lineJoin = stroke.join;
      ctx.miterLimit = stroke.miter;
      if (ctx.isPointInStroke(stroke.path, x, y)) return true;
    }
    return false;
  }
}
