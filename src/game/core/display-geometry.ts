import {
  DISPLAY_IDENTITY,
  displayMatrixPoint,
  displayMatrixProduct,
  displayMatrixRectangle,
  inverseDisplayMatrix,
  type DisplayMatrix,
  type DisplayRectangle,
} from './display-transform';
import { displayTwips } from './display-values';
import type { Vec } from './types';

export type DisplayGeometryContent =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'leaf';
      /** Original declared integer-twip extents, not raster or painted bounds. */
      readonly bounds: Readonly<DisplayRectangle>;
      /** Geometry only, including the existing stage-pixel minimum for strokes. */
      readonly hit: (
        point: Readonly<Vec>,
        inverse: Readonly<DisplayMatrix>,
        context: Readonly<{ toStage: Readonly<DisplayMatrix>; stagePoint: Readonly<Vec> }>,
      ) => boolean;
    }
  | { readonly kind: 'container'; readonly children: readonly DisplayGeometryNode[] };
export interface DisplayGeometryNode {
  readonly matrix: Readonly<DisplayMatrix>;
  readonly depth?: number;
  readonly clipDepth?: number;
  readonly visible?: boolean;
  /** Actual maskee reference exists; this node is excluded from ordinary queries. */
  readonly isRuntimeMask?: boolean;
  /** A retained reference, even when the mask is outside this physical subtree. */
  readonly runtimeMask?: {
    readonly node: DisplayGeometryNode;
    readonly parentToStage: Readonly<DisplayMatrix>;
  };
  readonly content: DisplayGeometryContent;
}
const union = (
  a: DisplayRectangle | undefined,
  b: DisplayRectangle | undefined,
): DisplayRectangle | undefined =>
  !a
    ? b
    : !b
      ? a
      : {
          xMin: Math.min(a.xMin, b.xMin),
          xMax: Math.max(a.xMax, b.xMax),
          yMin: Math.min(a.yMin, b.yMin),
          yMax: Math.max(a.yMax, b.yMax),
        };

/** Script width: transform each declared leaf before integer-twip union.
 * Masks and masked-out children participate. Never transform a pre-unioned AABB.
 */
export function displayGeometryBounds(
  node: DisplayGeometryNode,
  parent: Readonly<DisplayMatrix> = DISPLAY_IDENTITY,
): DisplayRectangle | undefined {
  const matrix = displayMatrixProduct(parent, node.matrix),
    content = node.content;
  if (content.kind === 'empty') return undefined;
  if (content.kind === 'leaf') return displayMatrixRectangle(matrix, content.bounds);
  let bounds: DisplayRectangle | undefined;
  for (const child of content.children)
    bounds = union(bounds, displayGeometryBounds(child, matrix));
  return bounds;
}

/** Internal stage-space shape query, not the public hitTestPoint argument mapping.
 * Authored depth masks use the qualified mutable latch and exact-end admission.
 * Runtime mask references have their own parent chain and visibility policy.
 * Parent-to-stage ancestry is separate from Script width; alpha never removes geometry.
 */
export function displayGeometryHit(
  node: DisplayGeometryNode,
  stagePoint: Readonly<Vec>,
  parentToStage: Readonly<DisplayMatrix> = DISPLAY_IDENTITY,
): boolean {
  const point = { x: displayTwips(stagePoint.x), y: displayTwips(stagePoint.y) };
  return hitAtTwips(node, point, parentToStage);
}

/** Public-query boundary with an explicitly selected argument coordinate space.
 * The caller supplies player-root versus stage mapping; this traversal does not
 * guess it from a display matrix. Keep transformed twips internal, avoiding an
 * extra Number/pixel roundtrip before native shape contact.
 */
export function displayGeometryHitTestPoint(
  receiver: {
    readonly node: DisplayGeometryNode;
    readonly onStage: boolean;
    readonly parentToStage: Readonly<DisplayMatrix>;
    readonly argumentToStage: Readonly<DisplayMatrix>;
  },
  argument: Readonly<Vec>,
): boolean {
  if (!receiver.onStage) return false;
  const point = displayMatrixPoint(receiver.argumentToStage, {
    x: displayTwips(argument.x),
    y: displayTwips(argument.y),
  });
  return hitAtTwips(receiver.node, point, receiver.parentToStage);
}

function hitAtTwips(
  node: DisplayGeometryNode,
  point: Readonly<Vec>,
  parentToStage: Readonly<DisplayMatrix>,
): boolean {
  const stage = { x: point.x / 20, y: point.y / 20 };
  const hit = (
    node: DisplayGeometryNode,
    parent: Readonly<DisplayMatrix>,
    skipRuntimeMasks = true,
    skipInvisible = false,
  ): boolean => {
    if (skipRuntimeMasks && node.isRuntimeMask) return false;
    if (skipInvisible && node.visible === false && !node.isRuntimeMask) return false;
    const matrix = displayMatrixProduct(parent, node.matrix),
      content = node.content;
    const mask = node.runtimeMask;
    if (mask && !hit(mask.node, mask.parentToStage, false, false)) return false;
    if (content.kind === 'empty') return false;
    if (content.kind === 'leaf') {
      const inverse = inverseDisplayMatrix(matrix);
      if (!inverse) return false;
      const local = displayMatrixPoint(inverse, point);
      return content.hit({ x: local.x / 20, y: local.y / 20 }, inverse, {
        toStage: matrix,
        stagePoint: stage,
      });
    }
    let clippedUntil = 0;
    for (const child of content.children) {
      if (child.clipDepth !== undefined && child.clipDepth > 0) {
        clippedUntil = hit(child, matrix, true, true) ? 0 : child.clipDepth;
        continue;
      }
      // Runtime addChild entries follow authored depths, outside their ranges.
      if (
        (child.depth ?? Infinity) >= clippedUntil &&
        hit(child, matrix, skipRuntimeMasks, skipInvisible)
      )
        return true;
    }
    return false;
  };
  return hit(node, parentToStage);
}
