import {
  displayMatrixProduct,
  displayMatrixRectangle,
  type DisplayMatrix,
  type DisplayRectangle,
} from './display-transform';
import type { Vec } from './types';

/** Advanced StaticText Engine bounds from its declared integer-twip rectangle.
 * Ancestors run from immediate parent toward the stage, excluding the stage.
 * Compose matrices before transforming corners; do not transform an AABB at
 * every ancestor. No text/glyph matrix, raster padding or Script getter enters
 * this calculation. Qualified for the finite 2D, no-scroll-rect controls in
 * docs/text-engine-runtime-reference.md; not arbitrary/nonfinite geometry.
 */
export function staticTextEngineBounds(
  declared: Readonly<DisplayRectangle>,
  own: Readonly<DisplayMatrix>,
  ancestors: readonly Readonly<DisplayMatrix>[],
): DisplayRectangle {
  let world = own;
  for (const parent of ancestors) world = displayMatrixProduct(parent, world);
  return displayMatrixRectangle(world, declared);
}

/** Internal advanced-text stage gate, with an already quantized twip Point.
 * Public argument mapping/quantization, attachment and HitTestOptions belong to
 * the caller. This is not normal-mode glyph contact or container traversal.
 * In particular, this gate needs no inverse, including collapsed line/point
 * bounds. Do not apply generic shape mask/inverse rules to this leaf by default.
 */
export function advancedStaticTextStageContains(
  declared: Readonly<DisplayRectangle>,
  own: Readonly<DisplayMatrix>,
  ancestors: readonly Readonly<DisplayMatrix>[],
  stageTwips: Readonly<Vec>,
): boolean {
  const bounds = staticTextEngineBounds(declared, own, ancestors);
  return (
    stageTwips.x >= bounds.xMin &&
    stageTwips.x <= bounds.xMax &&
    stageTwips.y >= bounds.yMin &&
    stageTwips.y <= bounds.yMax
  );
}
