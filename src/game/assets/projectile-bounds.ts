import { displayMatrixProduct, displayMatrixRectangle } from '../core/display-transform';
import type { SwfClip } from './swf-clip';
import type { Projectile, Vec } from '../core/types';
import type { Bounds, DisplayPlacement, SwfMatrix } from './asset-pack';

export interface ScriptBoundsSource {
  /** Declared shape bounds, including strokes; morphs return their start bounds. */
  leafBounds(id: number): Bounds | undefined;
  displayList(id: number, age: number): readonly DisplayPlacement[];
  childAge(parentId: number, age: number, placement: DisplayPlacement): number;
}

interface ChildOverride {
  age?: number;
  matrix?: SwfMatrix;
}
type Override = (
  placement: DisplayPlacement,
  age: number,
  path: readonly string[],
) => ChildOverride | undefined;

const identity: SwfMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

/** SWF translations remain in twips throughout composition. */
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
function transformed(bounds: Bounds, m: SwfMatrix): Bounds {
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ].map(([x, y]) => ({ x: m.a * x + m.c * y + m.tx / 20, y: m.b * x + m.d * y + m.ty / 20 }));
  const x = Math.min(...corners.map((p) => p.x)),
    y = Math.min(...corners.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...corners.map((p) => p.x)) - x,
    height: Math.max(...corners.map((p) => p.y)) - y,
  };
}
function union(a: Bounds | undefined, b: Bounds | undefined): Bounds | undefined {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}

interface BoundsArithmetic {
  multiply(left: SwfMatrix, right: SwfMatrix): SwfMatrix;
  transform(bounds: Bounds, matrix: SwfMatrix): Bounds;
}
const continuousBounds: BoundsArithmetic = { multiply, transform: transformed };
const twipBounds: BoundsArithmetic = {
  multiply: displayMatrixProduct,
  transform: (bounds, matrix) => {
    const rectangle = displayMatrixRectangle(matrix, {
      // Recover the declared integer twips from the legacy pixel-source API.
      // This is metadata decoding, not a truncating DisplayObject setter.
      xMin: Math.round(bounds.x * 20),
      yMin: Math.round(bounds.y * 20),
      xMax: Math.round((bounds.x + bounds.width) * 20),
      yMax: Math.round((bounds.y + bounds.height) * 20),
    });
    return {
      x: rectangle.xMin,
      y: rectangle.yMin,
      width: rectangle.xMax - rectangle.xMin,
      height: rectangle.yMax - rectangle.yMin,
    };
  },
};

/** Existing continuous approximation; retained callers need individual source qualification. */
export function scriptBounds(
  source: ScriptBoundsSource,
  id: number,
  age: number,
  matrix: SwfMatrix = identity,
  override?: Override,
  path: readonly string[] = [],
  depth = 0,
  pose?: SwfClip,
): Bounds | undefined {
  return visitBounds(continuousBounds, source, id, age, matrix, override, path, depth, pose);
}

/**
 * DisplayObject width/height arithmetic: compose float32 matrices, transform
 * declared leaf twips with ties-even BEFORE integer translation, then union.
 * Mask/alpha children participate; this is neither paint nor getBounds(target).
 * Keep integer extents until the final pixel conversion. See docs/script-bounds-arithmetic.md.
 */
export function scriptTwipBounds(
  source: ScriptBoundsSource,
  id: number,
  age: number,
  matrix: SwfMatrix = identity,
  override?: Override,
  path: readonly string[] = [],
  depth = 0,
  pose?: SwfClip,
): Bounds | undefined {
  const bounds = visitBounds(twipBounds, source, id, age, matrix, override, path, depth, pose);
  return (
    bounds && {
      x: bounds.x / 20,
      y: bounds.y / 20,
      width: bounds.width / 20,
      height: bounds.height / 20,
    }
  );
}

function visitBounds(
  arithmetic: BoundsArithmetic,
  source: ScriptBoundsSource,
  id: number,
  age: number,
  matrix: SwfMatrix = identity,
  override?: Override,
  path: readonly string[] = [],
  depth = 0,
  pose?: SwfClip,
): Bounds | undefined {
  if (depth > 24) return undefined;
  const leaf = source.leafBounds(id);
  if (leaf) return arithmetic.transform(leaf, matrix);
  let result: Bounds | undefined;
  for (const p of pose?.placements ?? source.displayList(id, age)) {
    const childPath = [...path, p.name ?? `#${p.depth}`],
      childPose = pose?.children.get(p.depth)?.clip,
      childAge = childPose?.age ?? source.childAge(id, age, p),
      change = override?.(p, childAge, childPath);
    result = union(
      result,
      visitBounds(
        arithmetic,
        source,
        p.charId,
        change?.age ?? childAge,
        arithmetic.multiply(matrix, change?.matrix ?? p.matrix),
        override,
        childPath,
        depth + 1,
        childPose,
      ),
    );
  }
  return result;
}

/** Bounds in the projectile's field coordinates, independently of painting. */
export function projectileScriptBounds(
  source: ScriptBoundsSource,
  bullet: Projectile,
  owner?: Vec,
): Bounds | undefined {
  const frame = bullet.artFrame ?? bullet.age + 1,
    scale = bullet.artScale ?? 1,
    angle = ((bullet.kind === 'grow' ? bullet.heading : bullet.angle) * Math.PI) / 180,
    matrix: SwfMatrix = {
      a: Math.cos(angle) * scale,
      b: Math.sin(angle) * scale,
      c: -Math.sin(angle) * scale,
      d: Math.cos(angle) * scale,
      tx: bullet.x * 20,
      ty: bullet.y * 20,
    };
  const override: Override = (p, age, path) => {
    if ((bullet.kind === 'beam' || bullet.kind === 'healBeam') && path.length === 1) {
      const length = Math.max(0, bullet.beamLength ?? 0);
      if (p.name === 'endCap_mc') return { matrix: { ...p.matrix, tx: length * 20 } };
      if (p.name === 'line_mc' || p.name === 'mask_mc') {
        const local = scriptBounds(source, p.charId, age),
          width = local?.width ?? 0,
          target = p.name === 'line_mc' ? length : length + 4;
        if (width > 0) return { matrix: { ...p.matrix, a: target / width, b: 0 } };
      }
    }
    if (bullet.kind === 'turret') {
      if (path.length === 1 && p.name === 'inner_mc')
        return { age: bullet.build ?? bullet.artFrame ?? 1 };
      if (
        path.length === 2 &&
        path[0] === 'inner_mc' &&
        p.name === 'turret_mc' &&
        bullet.build === 4 &&
        bullet.stopped &&
        owner
      ) {
        const rotation = Math.atan2(owner.y - bullet.y, owner.x - bullet.x) - angle,
          sx = Math.hypot(p.matrix.a, p.matrix.b),
          sy = Math.hypot(p.matrix.c, p.matrix.d);
        return {
          matrix: {
            ...p.matrix,
            a: Math.cos(rotation) * sx,
            b: Math.sin(rotation) * sx,
            c: -Math.sin(rotation) * sy,
            d: Math.cos(rotation) * sy,
          },
        };
      }
    }
    return undefined;
  };
  return scriptBounds(source, bullet.symbol, frame, matrix, override, [], 0, bullet.artPose);
}

/** Legacy bounds for unknown future symbols; known mock shots use authored numeric geometry. */
export function mockProjectileBounds(bullet: Projectile): Bounds {
  if (bullet.artPose && !bullet.artPose.placements.length)
    return { x: bullet.x, y: bullet.y, width: 0, height: 0, empty: true };
  if (bullet.kind === 'beam' || bullet.kind === 'healBeam') {
    const angle = (bullet.angle * Math.PI) / 180;
    return transformed(
      { x: 0, y: -1, width: Math.max(0, bullet.beamLength ?? bullet.speed), height: 2 },
      {
        a: Math.cos(angle),
        b: Math.sin(angle),
        c: -Math.sin(angle),
        d: Math.cos(angle),
        tx: bullet.x * 20,
        ty: bullet.y * 20,
      },
    );
  }
  // Include the authored fallback stroke, just as Script bounds include shape strokes.
  const radius =
    bullet.kind === 'mine' || bullet.kind === 'seekerMine'
      ? 4.25
      : bullet.kind === 'turret'
        ? 8.5
        : bullet.radius;
  return { x: bullet.x - radius, y: bullet.y - radius, width: radius * 2, height: radius * 2 };
}
