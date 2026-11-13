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
import { advancedStaticTextStageContains } from './static-text-geometry';
import type { Vec } from './types';

export type DisplayGeometryContent =
  | { readonly kind: 'empty' }
  | {
      /** Selected only from qualified native StaticText metadata, never glyph/paint bounds. */
      readonly kind: 'advanced-static-text';
      readonly bounds: Readonly<DisplayRectangle>;
    }
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
  /** Not qualified by this geometry reader; retained owners must not omit it. */
  readonly scrollRect?: Readonly<DisplayRectangle>;
  /** Actual maskee reference exists; this node is excluded from ordinary queries. */
  readonly isRuntimeMask?: boolean;
  /** A retained reference, even when the mask is outside this physical subtree. */
  readonly runtimeMask?: {
    readonly node: DisplayGeometryNode;
    readonly parentToStage: Readonly<DisplayMatrix>;
    readonly parentAncestry?: DisplayGeometryAncestry;
  };
  readonly content: DisplayGeometryContent;
}
/** Actual immediate parent through Main, excluding stage. An empty list means
 * physically parented by stage. A precomposed matrix is NOT an ancestor list:
 * Float32 products/rounded translations are not associative. Owners must supply
 * the actual no-scrollRect chain for text; legacy shape callers keep their
 * existing parentToStage contract. No root/attachment identity is inferred.
 */
export type DisplayGeometryAncestry = readonly Readonly<DisplayMatrix>[];
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
  if (node.scrollRect) throw new Error('Unsupported retained geometry scrollRect');
  const matrix = displayMatrixProduct(parent, node.matrix),
    content = node.content;
  if (content.kind === 'empty') return undefined;
  if (content.kind === 'leaf' || content.kind === 'advanced-static-text')
    return displayMatrixRectangle(matrix, content.bounds);
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
  parentAncestry?: DisplayGeometryAncestry,
): boolean {
  const point = { x: displayTwips(stagePoint.x), y: displayTwips(stagePoint.y) };
  return hitAtTwips(node, point, parentToStage, parentAncestry);
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
    readonly parentAncestry?: DisplayGeometryAncestry;
    readonly argumentToStage: Readonly<DisplayMatrix>;
  },
  argument: Readonly<Vec>,
): boolean {
  if (!receiver.onStage) return false;
  const point = displayMatrixPoint(receiver.argumentToStage, {
    x: displayTwips(argument.x),
    y: displayTwips(argument.y),
  });
  return hitAtTwips(receiver.node, point, receiver.parentToStage, receiver.parentAncestry);
}

function hitAtTwips(
  node: DisplayGeometryNode,
  point: Readonly<Vec>,
  parentToStage: Readonly<DisplayMatrix>,
  parentAncestry: DisplayGeometryAncestry | undefined,
): boolean {
  const stage = { x: point.x / 20, y: point.y / 20 };
  const hit = (
    node: DisplayGeometryNode,
    parent: Readonly<DisplayMatrix>,
    ancestors: DisplayGeometryAncestry | undefined,
    skipRuntimeMasks = true,
    skipInvisible = false,
  ): boolean => {
    if (node.scrollRect) throw new Error('Unsupported retained geometry scrollRect');
    const content = node.content;
    if (content.kind === 'advanced-static-text') {
      if (!ancestors) throw new Error('Advanced StaticText requires explicit parentAncestry');
      if (![node.matrix, ...ancestors].every((m) => Object.values(m).every(Number.isFinite)))
        throw new Error('Unsupported nonfinite StaticText ancestry');
      // Tagged StaticText does not test SKIP_MASK or assigned masks. Only the
      // assigned-mask bypass is measured; being a text mask remains unsupported.
      if (node.isRuntimeMask || (node.clipDepth ?? 0) > 0 || skipInvisible)
        throw new Error('Unsupported StaticText mask role/options');
      return advancedStaticTextStageContains(content.bounds, node.matrix, ancestors, point);
    }
    if (skipRuntimeMasks && node.isRuntimeMask) return false;
    if (skipInvisible && node.visible === false && !node.isRuntimeMask) return false;
    const matrix = displayMatrixProduct(parent, node.matrix);
    const mask = node.runtimeMask;
    if (mask && !hit(mask.node, mask.parentToStage, mask.parentAncestry, false, false))
      return false;
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
    // The measured MovieClip text wrappers require an inverse before children.
    // Keep this correction bounded to text-bearing containers, preserving legacy
    // shape/Script products; no arbitrary container Engine AABB is substituted.
    if (containsText(node)) {
      if (!ancestors) throw new Error('Advanced StaticText requires explicit parentAncestry');
      let containerWorld = node.matrix;
      for (const ancestor of ancestors)
        containerWorld = displayMatrixProduct(ancestor, containerWorld);
      if (!inverseDisplayMatrix(containerWorld)) return false;
      // A runtime addChild above all authored mask ends is not masked text.
      // Reject potential overlap conservatively, independently of which mask
      // hits this query; do not reject disjoint tutorial siblings outright.
      const lastMaskEnd = Math.max(0, ...content.children.map((child) => child.clipDepth ?? 0));
      if (
        lastMaskEnd > 0 &&
        content.children.some(
          (child) => containsText(child) && (child.depth ?? Infinity) < lastMaskEnd,
        )
      )
        throw new Error('Unsupported authored mask/StaticText combination');
    }
    const childAncestors = ancestors && [node.matrix, ...ancestors];
    let clippedUntil = 0;
    for (const child of content.children) {
      if (child.clipDepth !== undefined && child.clipDepth > 0) {
        clippedUntil = hit(child, matrix, childAncestors, true, true) ? 0 : child.clipDepth;
        continue;
      }
      // Runtime addChild entries follow authored depths, outside their ranges.
      if (
        (child.depth ?? Infinity) >= clippedUntil &&
        hit(child, matrix, childAncestors, skipRuntimeMasks, skipInvisible)
      )
        return true;
    }
    return false;
  };
  return hit(node, parentToStage, parentAncestry);
}

function containsText(node: DisplayGeometryNode): boolean {
  return (
    node.content.kind === 'advanced-static-text' ||
    (node.content.kind === 'container' && node.content.children.some(containsText))
  );
}
