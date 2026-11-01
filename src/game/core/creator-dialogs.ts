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
