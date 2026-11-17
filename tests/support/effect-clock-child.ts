import type { ArtClip } from '../../src/game/assets/art-clip';
import type { DisplayPlacement } from '../../src/game/assets/asset-pack';

/** getChildAt paths follow render order, not a retained Map's insertion history.
 * This maps the candidate's authored children only; it does not emulate
 * transient null lookups or prove that a candidate is the same object.
 */
export function effectClockChildAtPath(root: ArtClip, path: string): ArtClip | undefined {
  let current: ArtClip | undefined = root;
  for (const index of path.split('/').slice(1).map(Number)) {
    const placement: DisplayPlacement | undefined = current?.placements[index];
    current = placement ? current?.children.get(placement.depth)?.clip : undefined;
  }
  return current;
}
