import data from '../data/creator-controls.json';
import type { ArtMatrix } from '../assets/asset-pack';
export interface CreatorPrimitive {
  font?: string;
  bold?: boolean;
  italic?: boolean;
  id: number;
  kind: string;
  innerBounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  matrix: ArtMatrix;
  boundsMatrix?: ArtMatrix;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  fill?: number[] | null;
  stroke?: { color: number[]; width: number } | null;
  paths?: {
    d: string;
    rule?: 'nonzero' | 'evenodd';
    fill?: number[];
    stroke?: number[];
    width?: number;
    cap?: 'round' | 'butt' | 'square';
    join?: 'round' | 'bevel' | 'miter';
  }[];
  glyphs?: { text: string; x: number; y: number; size: number; color: number[] }[];
  textLines?: {
    text: string;
    x: number;
    y: number;
    size: number;
    color: number[];
    width: number;
  }[];
}
export interface CreatorControl {
  name: string;
  symbol: number;
  matrix: ArtMatrix;
  bounds: { x: number; y: number; width: number; height: number };
  variants: Record<string, CreatorPrimitive[]>;
}
export interface CreatorSliderLayout {
  name: string;
  symbol: number;
  matrix: ArtMatrix;
  track: CreatorPrimitive[];
  handle: { symbol: number; matrix: ArtMatrix; variants: CreatorPrimitive[][] };
}
export const CREATOR_CONTROLS = data as {
  symbol: number;
  workspace: ArtMatrix;
  controls: CreatorControl[];
  sliders: CreatorSliderLayout[];
};
export const creatorControl = (name: string) =>
  CREATOR_CONTROLS.controls.find((c) => c.name === name)!;
