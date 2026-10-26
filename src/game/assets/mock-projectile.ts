import { rotate } from '../core/math';
import type { Projectile, Vec } from '../core/types';
import type { Bounds, SwfMatrix } from './asset-pack';
import { mockProjectileShapes } from './projectile-geometry';

export interface MockProjectilePolygon {
  points: number[];
  color: number;
  lineColor: number;
  fillAlpha: number;
  lineAlpha: number;
  lineWidth: number;
  bounds: Bounds;
  details: { points: number[]; color: number; alpha: number }[];
}
const segments = 48;
function rectangle(bounds: Bounds, matrix: SwfMatrix): Vec[] {
  return [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x + bounds.width, bounds.y + bounds.height],
    [bounds.x, bounds.y + bounds.height],
  ].map(([x, y]) => ({
    x: matrix.a * x + matrix.c * y + matrix.tx / 20,
    y: matrix.b * x + matrix.d * y + matrix.ty / 20,
  }));
}
function ellipse(bounds: Bounds, matrix: SwfMatrix): Vec[] {
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index * Math.PI * 2) / segments;
    const x = cx + (Math.cos(angle) * bounds.width) / 2,
      y = cy + (Math.sin(angle) * bounds.height) / 2;
    return {
      x: matrix.a * x + matrix.c * y + matrix.tx / 20,
      y: matrix.b * x + matrix.d * y + matrix.ty / 20,
    };
  });
}
const cross = (a: Vec, b: Vec, p: Vec) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
/** Clip procedural ellipses against the numeric bounds of each authored mask. */
function clipPolygon(points: Vec[], mask: Vec[]): Vec[] {
  if (mask.length < 3) return [];
  const winding =
    mask.reduce((sum, a, index) => {
      const b = mask[(index + 1) % mask.length];
      return sum + a.x * b.y - b.x * a.y;
    }, 0) < 0
      ? -1
      : 1;
  for (let i = 0; i < mask.length && points.length; i++) {
    const a = mask[i],
      b = mask[(i + 1) % mask.length],
      input = points;
    points = [];
    let previous = input.at(-1)!,
      previousDistance = cross(a, b, previous) * winding;
    for (const current of input) {
      const currentDistance = cross(a, b, current) * winding;
      if (currentDistance >= -1e-8 !== previousDistance >= -1e-8) {
        const fraction = previousDistance / (previousDistance - currentDistance);
        points.push({
          x: previous.x + (current.x - previous.x) * fraction,
          y: previous.y + (current.y - previous.y) * fraction,
        });
      }
      if (currentDistance >= -1e-8) points.push(current);
      previous = current;
      previousDistance = currentDistance;
    }
  }
  return points;
}
const cache = new WeakMap<
  Projectile,
  { key: string; pose: Projectile['artPose']; polygons: MockProjectilePolygon[] | undefined }
>();

/** Drawn geometry and point contact share these transformed procedural silhouettes. */
export function mockProjectilePolygons(
  b: Projectile,
  owner?: Vec,
): MockProjectilePolygon[] | undefined {
  const key = [
    b.symbol,
    b.kind,
    b.enemy,
    b.x,
    b.y,
    b.angle,
    b.heading,
    b.artScale,
    b.artFrame,
    b.age,
    b.artPose?.age,
    b.beamLength,
    b.build,
    b.stopped,
    owner?.x,
    owner?.y,
  ].join('|');
  const previous = cache.get(b);
  if (previous?.key === key && previous.pose === b.artPose) return previous.polygons;
  const shapes = mockProjectileShapes(b, owner);
  const scale = b.artScale ?? 1,
    angle = b.kind === 'grow' ? b.heading : b.angle;
  const fieldPoints = (points: Vec[]) =>
    points.flatMap((point) => {
      const p = rotate({ x: point.x * scale, y: point.y * scale }, angle);
      return [b.x + p.x, b.y + p.y];
    });
  const polygons = shapes?.flatMap((shape) => {
    if (
      Math.abs(shape.matrix.a * shape.matrix.d - shape.matrix.b * shape.matrix.c) < 1e-9 ||
      shape.bounds.width <= 0 ||
      shape.bounds.height <= 0
    )
      return [];
    const bounds = shape.bounds;
    const pieces =
      b.kind === 'flak'
        ? [
            { x: bounds.x, y: bounds.y, width: bounds.width * 0.55, height: bounds.height * 0.55 },
            {
              x: bounds.x + bounds.width * 0.45,
              y: bounds.y + bounds.height * 0.45,
              width: bounds.width * 0.55,
              height: bounds.height * 0.55,
            },
          ]
        : [bounds];
    return pieces.flatMap((bounds) => {
      const beam = b.kind === 'beam' || b.kind === 'healBeam';
      let points =
        beam && bounds.width > bounds.height * 5
          ? rectangle(bounds, shape.matrix)
          : ellipse(bounds, shape.matrix);
      for (const mask of shape.masks ?? [])
        points = clipPolygon(points, rectangle(mask.bounds, mask.matrix));
      if (points.length < 3) return [];
      const transformed = fieldPoints(points),
        color = shape.color ?? (b.enemy ? 0xc88943 : 0xe9b92d);
      const xs = transformed.filter((_, index) => index % 2 === 0),
        ys = transformed.filter((_, index) => index % 2 === 1);
      const x = Math.min(...xs),
        y = Math.min(...ys);
      const details: MockProjectilePolygon['details'] = [];
      if (!beam && shape.fillAlpha > 0.25) {
        const rx = bounds.width / 2,
          ry = bounds.height / 2,
          cx = bounds.x + rx,
          cy = bounds.y + ry;
        const dark =
          ((((color >> 16) & 255) * 0.55) << 16) |
          ((((color >> 8) & 255) * 0.55) << 8) |
          ((color & 255) * 0.55);
        const spots =
          b.kind === 'flak'
            ? [
                [-0.25, -0.4, 0.12, 0.16, 0xffffff, 0.65],
                [0.45, 0.15, 0.08, 0.11, 0xffffff, 0.5],
                [-0.25, 0.5, 0.09, 0.12, 0xffffff, 0.45],
              ]
            : [
                [-0.35, -0.4, 0.13, 0.18, 0xffffff, 0.7],
                [0.32, 0.32, 0.18, 0.23, dark, 0.42],
                [-0.25, 0.55, 0.12, 0.14, dark, 0.3],
              ];
        for (const [dx, dy, sx, sy, color, alpha] of spots) {
          let glint = ellipse(
            {
              x: cx + (dx - sx) * rx,
              y: cy + (dy - sy) * ry,
              width: sx * rx * 2,
              height: sy * ry * 2,
            },
            shape.matrix,
          );
          for (const mask of shape.masks ?? [])
            glint = clipPolygon(glint, rectangle(mask.bounds, mask.matrix));
          if (glint.length >= 3)
            details.push({ points: fieldPoints(glint), color, alpha: alpha * shape.alpha });
        }
      }
      const leafScale = Math.sqrt(
        Math.abs(shape.matrix.a * shape.matrix.d - shape.matrix.b * shape.matrix.c),
      );
      return [
        {
          points: transformed,
          color,
          lineColor: shape.lineColor ?? 0xffe7b0,
          fillAlpha: Math.max(0.09, shape.fillAlpha) * shape.alpha,
          lineAlpha: Math.max(0.65, shape.lineAlpha) * shape.alpha,
          lineWidth: Math.max(0.4, shape.lineWidth * leafScale * scale),
          bounds: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
          details,
        },
      ];
    });
  });
  cache.set(b, { key, pose: b.artPose, polygons });
  return polygons;
}
function contains(points: number[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const ax = points[j],
      ay = points[j + 1],
      bx = points[i],
      by = points[i + 1];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (
      Math.abs(cross) < 1e-7 &&
      x >= Math.min(ax, bx) - 1e-7 &&
      x <= Math.max(ax, bx) + 1e-7 &&
      y >= Math.min(ay, by) - 1e-7 &&
      y <= Math.max(ay, by) + 1e-7
    )
      return true;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function mockProjectileHit(b: Projectile, x: number, y: number) {
  const polygons = mockProjectilePolygons(b);
  if (polygons === undefined)
    return (
      (!b.artPose || !!b.artPose.placements.length) && Math.hypot(x - b.x, y - b.y) <= b.radius
    );
  return polygons.some(
    ({ points, bounds: r }) =>
      x >= r.x && y >= r.y && x <= r.x + r.width && y <= r.y + r.height && contains(points, x, y),
  );
}
