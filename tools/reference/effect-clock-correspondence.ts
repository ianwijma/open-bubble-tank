import type { SwfClip } from '../../src/game/assets/swf-clip';
import type { DisplayPlacement } from '../../src/game/assets/asset-pack';

/** Original getChildAt paths follow render order, not a retained Map's insertion history.
 * This maps the candidate's authored children only; it does not emulate original
 * transient null lookups or prove that a candidate is the same native object.
 */
export function effectClockChildAtPath(root: SwfClip, path: string): SwfClip | undefined {
  let current: SwfClip | undefined = root;
  for (const index of path.split('/').slice(1).map(Number)) {
    const placement: DisplayPlacement | undefined = current?.placements[index];
    current = placement ? current?.children.get(placement.depth)?.clip : undefined;
  }
  return current;
}
