import data from '../data/creator-palette.json';
import type { CreatorPrimitive } from './creator-controls';
import type { SwfMatrix } from '../assets/asset-pack';
export interface CreatorField {
  name: string;
  symbol: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontId: number;
  font: string;
  size: number;
  ascent: number;
  lineHeight: number;
  color: number[];
  align: number;
  spacing: number;
  bold: boolean;
  italic: boolean;
  wordWrap: boolean;
}
interface Piece {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: { x: number; y: number; width: number; height: number };
  art: CreatorPrimitive[][];
  frameBounds?: { x: number; y: number; width: number; height: number }[];
}
export const CREATOR_PALETTE = data as {
  origin: SwfMatrix;
  fonts: Record<number, Record<string, number>>;
  stats: {
    symbol: number;
    fields: CreatorField[];
    background: CreatorPrimitive[];
    header: CreatorPrimitive[];
  };
  library: {
    symbol: number;
    matrix: SwfMatrix;
    bounds: { x: number; y: number; width: number; height: number };
    mask: { x: number; y: number; width: number; height: number };
    inside: { x: number; y: number };
    preview: {
      x: number;
      y: number;
      bounds: { x: number; y: number; width: number; height: number };
    };
    caption: CreatorField;
  };
  tabs: (Piece & { category: number; label: string })[];
  row: {
    symbol: number;
    height: number;
    visible: number;
    bounds: { x: number; y: number; width: number; height: number };
    fields: CreatorField[];
    states: { color: number[] }[];
    codes: Record<number, number>;
  };
  scroll: { matrix: SwfMatrix; pieces: Piece[] };
};
