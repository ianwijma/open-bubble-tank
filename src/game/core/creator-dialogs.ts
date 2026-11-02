import data from '../data/creator-dialogs.json';
import type { CreatorPrimitive } from './creator-controls';
import type { CreatorField } from './creator-palette';
import type { SwfMatrix } from '../assets/asset-pack';
import type { Rect } from './types';
export type CreatorDialogFrame = 1 | 2 | 3 | 7;
export interface CreatorDialogButton {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: Rect;
  variants: Record<'up' | 'over' | 'down', CreatorPrimitive[]>;
  fields: Record<'up' | 'over' | 'down', CreatorField[]>;
}
export const CREATOR_DIALOGS = data as {
  symbol: number;
  alert: {
    symbol: number;
    matrix: SwfMatrix;
    fields: CreatorField[];
    staticIds: number[];
    art: CreatorPrimitive[];
  };
  frames: {
    frame: CreatorDialogFrame;
    fields: (CreatorField & { maxLength?: number })[];
    buttons: CreatorDialogButton[];
    staticIds: number[];
    art: CreatorPrimitive[];
  }[];
};
export const creatorDialogFrame = (frame: CreatorDialogFrame) =>
  CREATOR_DIALOGS.frames.find((f) => f.frame === frame)!;
/** _-Cb rejects the entire incoming TextEvent when any character is invalid. */
export function acceptsCreatorNameInput(text: string) {
  return !/[^a-zA-Z0-9 _\-']/.test(text);
}
/** beforeinput is not emitted for every browser/automation edit; validate just its inserted span. */
export function acceptsCreatorNameEdit(previous: string, next: string) {
  let start = 0,
    end = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  while (
    end < previous.length - start &&
    end < next.length - start &&
    previous[previous.length - end - 1] === next[next.length - end - 1]
  )
    end++;
  return acceptsCreatorNameInput(next.slice(start, next.length - end));
}
export const EMPTY_CREATOR_SUBMISSION = 'You cannot submit tanks with nothing in them...Thanks!';
