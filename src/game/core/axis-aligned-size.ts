import type { DisplayRectangle } from './display-transform';
import type { NumericPose } from './retained-transform';

/** Qualified positive, unrotated setter branch. Parent transforms do not enter width/height. */
export function positiveAxisAlignedSize(
  before: NumericPose,
  bounds: Readonly<DisplayRectangle>,
  property: 'width' | 'height',
  value: number,
): { scaleX: number; scaleY: number } | undefined {
  const { matrix, scaleX, scaleY, rotation } = before;
  const width = (bounds.xMax - bounds.xMin) / 20;
  const height = (bounds.yMax - bounds.yMin) / 20;
  if (
    ![value, width, height, scaleX, scaleY, matrix.tx, matrix.ty].every(Number.isFinite) ||
    value <= 0 ||
    width <= 0 ||
    height <= 0 ||
    scaleX <= 0 ||
    scaleY <= 0 ||
    rotation !== 0 ||
    matrix.b !== 0 ||
    matrix.c !== 0 ||
    matrix.a !== Math.fround(scaleX) ||
    matrix.d !== Math.fround(scaleY)
  )
    return undefined;
  return property === 'width'
    ? { scaleX: value / width, scaleY }
    : { scaleX, scaleY: value / height };
}
