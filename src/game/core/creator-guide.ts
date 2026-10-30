import data from '../data/creator-guide.json';
import type { CreatorPrimitive } from './creator-controls';
import type { SwfMatrix } from '../assets/asset-pack';
import type { Rect } from './types';

export const CREATOR_GUIDE = data as {
  symbol: number;
  parent: SwfMatrix;
  frames: {
    frame: number;
    staticIds: number[];
    art: CreatorPrimitive[];
    text: string;
    buttons: {
      name: string;
      symbol: number;
      matrix: SwfMatrix;
      bounds: Rect;
      art: CreatorPrimitive[][];
    }[];
  }[];
};
/** Tutorial968 uses off1, six stopped pages2..7 and entry-time profile latch _-Xq. */
export function advanceCreatorGuide(frame: number, back = false) {
  if (frame < 2) return 1;
  if (back) return Math.max(1, frame - 1);
  return frame === 7 ? 1 : frame + 1;
}
