import type { DisplayGeometryContent, DisplayGeometryNode } from '../core/display-geometry';
import { DISPLAY_IDENTITY } from '../core/display-transform';
import type { SwfClip } from './swf-clip';

export interface RetainedGeometrySource {
  /** Undefined means not a supported leaf, never known empty geometry. */
  leaf(id: number, ratio: number): DisplayGeometryContent | undefined;
  isSprite(id: number): boolean;
}

/** Read existing poses only. Construction, clock/entropy and runtime mask owners
 * belong to the caller; no timeline/age-derived fallback repairs missing children.
 */
export function retainedClipGeometry(
  pose: SwfClip,
  source: RetainedGeometrySource,
  ratio = 0,
): DisplayGeometryNode {
  const leaf = source.leaf(pose.id, ratio);
  if (leaf) return { matrix: DISPLAY_IDENTITY, content: leaf };
  if (!source.isSprite(pose.id)) throw new Error(`Unsupported retained geometry symbol ${pose.id}`);
  return {
    matrix: DISPLAY_IDENTITY,
    content: {
      kind: 'container',
      // getChildAt follows current render order, not Map insertion history.
      children: pose.placements.map((placement) => {
        const child = pose.children.get(placement.depth);
        if (
          !child ||
          child.clip.id !== placement.charId ||
          child.placement.bornFrame !== placement.bornFrame
        )
          throw new Error(`Unresolved retained child ${pose.id}/${placement.depth}`);
        return {
          ...retainedClipGeometry(child.clip, source, placement.ratio ?? 0),
          matrix: { ...placement.matrix },
          depth: placement.depth,
          clipDepth: placement.clipDepth,
        };
      }),
    },
  };
}
