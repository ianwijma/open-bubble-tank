import data from '../data/creator-controls.json';
import type { SwfMatrix } from '../assets/asset-pack';
export interface CreatorPrimitive {
  font?: string;
  bold?: boolean;
  italic?: boolean;
  id: number;
  kind: string;
  innerBounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  matrix: SwfMatrix;
  boundsMatrix?: SwfMatrix;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  fill?: number[] | null;
  stroke?: { color: number[]; width: number } | null;
  glyphs?: { text: string; x: number; y: number; size: number; color: number[] }[];
}
export interface CreatorControl {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: { x: number; y: number; width: number; height: number };
  variants: Record<string, CreatorPrimitive[]>;
}
export interface CreatorSliderLayout {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  track: CreatorPrimitive[];
  handle: { symbol: number; matrix: SwfMatrix; variants: CreatorPrimitive[][] };
}
export const CREATOR_CONTROLS = data as {
  symbol: number;
  workspace: SwfMatrix;
  controls: CreatorControl[];
  sliders: CreatorSliderLayout[];
};
export const creatorControl = (name: string) =>
  CREATOR_CONTROLS.controls.find((c) => c.name === name)!;
export const CREATOR_SELECTION_CONTROLS = [
  'DeleteButton_mc',
  'BringFront_mc',
  'SendBack_mc',
  'AlignCenter_mc',
  'Left_mc',
  'Right_mc',
] as const;
