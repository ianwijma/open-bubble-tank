import type { DisplayPlacement } from './asset-pack';
import { displayAlpha } from '../core/display-values';
export type SwfColorTransform = NonNullable<DisplayPlacement['color']>;
export const IDENTITY_COLOR: SwfColorTransform = { mult: [1, 1, 1, 1], add: [0, 0, 0, 0] };
const signed16 = (value: number) => (value << 16) >> 16;
const raw = (value: number) => signed16(Math.trunc(value * 256));
export const fixedColorMultiplier = displayAlpha;

/** Parent color acts on the child's result; offsets are expressed in Flash's byte units. */
export function composeColor(
  parent: SwfColorTransform,
  child: SwfColorTransform,
): SwfColorTransform {
  return {
    mult: parent.mult.map((value, i) => signed16((raw(value) * raw(child.mult[i])) >> 8) / 256),
    add: parent.add.map((value, i) =>
      signed16(value + ((raw(parent.mult[i]) * child.add[i]) >> 8)),
    ),
  };
}
