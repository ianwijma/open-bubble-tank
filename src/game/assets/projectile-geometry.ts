import type { Bounds, DisplayPlacement, SpriteInfo, SwfMatrix } from './asset-pack';
import type { Projectile, Vec } from '../core/types';
import type { SwfClip } from './swf-clip';
import { buildDisplayList } from './display-list';
import { projectileScriptBounds, scriptBounds, type ScriptBoundsSource } from './projectile-bounds';
import data from '../data/projectile-geometry.json';

export type { ScriptBoundsSource } from './projectile-bounds';
interface TwipBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
interface Leaf {
  bounds?: TwipBounds;
  startBounds?: TwipBounds;
  endBounds?: TwipBounds;
  fill?: number[];
  line?: number[];
  endFill?: number[];
  endLine?: number[];
  lineWidth: number;
  endLineWidth?: number;
}
const sprites = data.sprites as unknown as Record<number, SpriteInfo>;
const leaves = data.shapes as unknown as Record<number, Leaf>;
const identity: SwfMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const cache = new Map<string, DisplayPlacement[]>();
const pixels = (b: TwipBounds): Bounds => ({
  x: b.xMin / 20,
  y: b.yMin / 20,
  width: (b.xMax - b.xMin) / 20,
  height: (b.yMax - b.yMin) / 20,
});

/** Same frame wrapping and child-age convention as AssetPack; SwfClip supplies retained actions. */
export const projectileGeometrySource: ScriptBoundsSource & {
  spriteInfo(id: number): SpriteInfo | undefined;
  displayList(id: number, age: number): DisplayPlacement[];
} = {
  spriteInfo: (id) => sprites[id],
  leafBounds(id) {
    const leaf = leaves[id],
      bounds = leaf?.startBounds ?? leaf?.bounds;
    return bounds && pixels(bounds);
  },
  displayList(id, age) {
    const sprite = sprites[id];
    if (!sprite) return [];
    const frame = ((Math.max(1, Math.floor(age)) - 1) % sprite.frameCount) + 1,
      key = `${id}:${frame}`;
    let result = cache.get(key);
    if (!result) cache.set(key, (result = buildDisplayList(sprite, frame)));
    return result;
  },
  childAge(parentId, age, p) {
    const count = sprites[parentId]?.frameCount ?? 1;
    const local = count === 1 ? age : ((Math.max(1, Math.floor(age)) - 1) % count) + 1;
    const phase = sprites[p.charId]?.frameCount === 40 ? (p.depth + p.charId) % 11 : 0;
    return Math.max(1, local - p.bornFrame + 1) + phase;
  },
};
const known = (id: number) => !!sprites[id] || !!leaves[id];

/** Exact source Script AABB; alpha/masks do not alter this geometric query. */
export function authoredProjectileBounds(b: Projectile, owner?: Vec): Bounds | undefined {
  if (!known(b.symbol)) return undefined;
  return (
    projectileScriptBounds(projectileGeometrySource, b, owner) ?? {
      x: b.x,
      y: b.y,
      width: 0,
      height: 0,
      empty: true,
    }
  );
}

export interface MockProjectileMask {
  /** Conservative rectangular clip in mask-local pixels; matrix translations are twips. */
  bounds: Bounds;
  matrix: SwfMatrix;
}
export interface MockProjectileShape {
  /** An ellipse inscribed in the visible leaf's declared pixel bounds (strokes included). */
  bounds: Bounds;
  /** Flattened leaf→projectile-root-local transform. Root scale/angle/position are NOT applied. */
  matrix: SwfMatrix;
  alpha: number;
  color?: number;
  lineColor?: number;
  /** Relative opacities: multiply these by alpha exactly once when painting fill/line. */
  fillAlpha: number;
  lineAlpha: number;
  lineWidth: number;
  masks?: MockProjectileMask[];
}
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
type Color = { mult: number[]; add: number[] };
const opaque: Color = { mult: [1, 1, 1, 1], add: [0, 0, 0, 0] };
function tint(parent: Color, child?: Color): Color {
  if (!child) return parent;
  return {
    mult: parent.mult.map((m, i) => m * child.mult[i]),
    add: parent.add.map((a, i) => a + parent.mult[i] * child.add[i]),
  };
}
const clamp = (n: number) => Math.max(0, Math.min(255, n));
function rgba(start: number[] | undefined, end: number[] | undefined, t: number, color: Color) {
  if (!start) return;
  const result = start.map((value, i) =>
    clamp((value + ((end?.[i] ?? value) - value) * t) * color.mult[i] + color.add[i]),
  );
  return {
    color: (Math.round(result[0]) << 16) | (Math.round(result[1]) << 8) | Math.round(result[2]),
    alpha: result[3] / 255,
  };
}
function mixBounds(start: TwipBounds, end: TwipBounds | undefined, t: number): Bounds {
  if (!end) return pixels(start);
  const mix = (key: keyof TwipBounds) => start[key] + (end[key] - start[key]) * t;
  return pixels({ xMin: mix('xMin'), xMax: mix('xMax'), yMin: mix('yMin'), yMax: mix('yMax') });
}

/**
 * Numeric ellipse silhouettes for both mock painting and contact. Fully transparent
 * helpers and mask artwork are excluded; active masks are exposed as rectangular
 * constraints (their original vector contours are intentionally not imported).
 */
export function mockProjectileShapes(
  b: Projectile,
  owner?: Vec,
): MockProjectileShape[] | undefined {
  if (!known(b.symbol)) return undefined;
  const result: MockProjectileShape[] = [];
  function visit(
    id: number,
    age: number,
    matrix: SwfMatrix,
    color: Color,
    ratio = 0,
    pose?: SwfClip,
    path: string[] = [],
    masks: MockProjectileMask[] = [],
    depth = 0,
  ) {
    if (depth > 24) return;
    const leaf = leaves[id];
    if (leaf) {
      const t = Math.max(0, Math.min(65535, ratio)) / 65535;
      const fill = rgba(leaf.fill, leaf.endFill, t, color),
        line = rgba(leaf.line, leaf.endLine, t, color);
      const alpha = Math.max(fill?.alpha ?? 0, line?.alpha ?? 0);
      const bounds = leaf.startBounds ?? leaf.bounds;
      if (!bounds || alpha <= 0) return;
      result.push({
        bounds: mixBounds(bounds, leaf.endBounds, t),
        matrix,
        alpha,
        color: fill?.color,
        lineColor: line?.color,
        fillAlpha: (fill?.alpha ?? 0) / alpha,
        lineAlpha: (line?.alpha ?? 0) / alpha,
        lineWidth: leaf.lineWidth + ((leaf.endLineWidth ?? leaf.lineWidth) - leaf.lineWidth) * t,
        ...(masks.length ? { masks } : {}),
      });
      return;
    }
    const activeMasks: { end: number; mask: MockProjectileMask }[] = [];
    const placements = pose?.placements ?? projectileGeometrySource.displayList(id, age);
    const dynamicBeam = (b.kind === 'beam' || b.kind === 'healBeam') && path.length === 0;
    const beamMask = dynamicBeam && placements.find((p) => p.name === 'mask_mc');
    let beamConstraint: MockProjectileMask | undefined;
    if (beamMask) {
      const maskAge =
        pose?.children.get(beamMask.depth)?.clip.age ??
        projectileGeometrySource.childAge(id, age, beamMask);
      const bounds = scriptBounds(projectileGeometrySource, beamMask.charId, maskAge);
      if (bounds && bounds.width > 0)
        beamConstraint = {
          bounds,
          matrix: multiply(matrix, {
            ...beamMask.matrix,
            a: (Math.max(0, b.beamLength ?? 0) + 4) / bounds.width,
            b: 0,
          }),
        };
    }
    for (const p of placements) {
      const childPath = [...path, p.name ?? `#${p.depth}`],
        childPose = pose?.children.get(p.depth)?.clip;
      let childAge = childPose?.age ?? projectileGeometrySource.childAge(id, age, p),
        local = p.matrix;
      if (dynamicBeam) {
        // _-CO/HealerBeam assign this mask dynamically, rather than via clipDepth.
        if (p.name === 'mask_mc') continue;
        const length = Math.max(0, b.beamLength ?? 0);
        if (p.name === 'endCap_mc') local = { ...local, tx: length * 20 };
        if (p.name === 'line_mc' || p.name === 'mask_mc') {
          const width = scriptBounds(projectileGeometrySource, p.charId, childAge)?.width ?? 0;
          if (width > 0)
            local = { ...local, a: (p.name === 'line_mc' ? length : length + 4) / width, b: 0 };
        }
      }
      if (b.kind === 'turret') {
        if (path.length === 0 && p.name === 'inner_mc') childAge = b.build ?? b.artFrame ?? 1;
        if (
          path.length === 1 &&
          path[0] === 'inner_mc' &&
          p.name === 'turret_mc' &&
          b.build === 4 &&
          b.stopped &&
          owner
        ) {
          const angle = Math.atan2(owner.y - b.y, owner.x - b.x) - (b.angle * Math.PI) / 180,
            sx = Math.hypot(local.a, local.b),
            sy = Math.hypot(local.c, local.d);
          local = {
            ...local,
            a: Math.cos(angle) * sx,
            b: Math.sin(angle) * sx,
            c: -Math.sin(angle) * sy,
            d: Math.cos(angle) * sy,
          };
        }
      }
      const composed = multiply(matrix, local);
      if (p.clipDepth !== undefined) {
        const bounds = scriptBounds(projectileGeometrySource, p.charId, childAge);
        if (bounds) activeMasks.push({ end: p.clipDepth, mask: { bounds, matrix: composed } });
        continue;
      }
      visit(
        p.charId,
        childAge,
        composed,
        tint(color, p.color),
        p.ratio ?? 0,
        childPose,
        childPath,
        [
          ...masks,
          ...(p.name === 'beam_mc' && beamConstraint ? [beamConstraint] : []),
          ...activeMasks.filter((mask) => p.depth <= mask.end).map((entry) => entry.mask),
        ],
        depth + 1,
      );
    }
  }
  visit(b.symbol, b.artFrame ?? b.age + 1, identity, opaque, 0, b.artPose);
  return result;
}
