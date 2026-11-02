import data from '../data/tank-viewer.json';
import type { CreatorField } from './creator-palette';
import type { CreatorPrimitive } from './creator-controls';
import type { SwfMatrix } from '../assets/asset-pack';
import type { Rect } from './types';
export interface ViewerField extends CreatorField {
  maxLength?: number;
  matrix: SwfMatrix;
}
export interface ViewerPiece {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: Rect;
}
export interface ViewerWidget {
  symbol: number;
  frame: number;
  fields: ViewerField[];
  staticDepths: number[];
  art: CreatorPrimitive[];
  children: ViewerPiece[];
  clips?: { symbol: number; bounds: Rect }[];
}
export const TANK_VIEWER = data as {
  symbol: number;
  widgets: ViewerWidget[];
  root: ViewerPiece[];
  fields: ViewerField[];
  guideNote: ViewerField;
  rowBounds: Rect;
  mask: Rect;
  helper: Rect;
  sortButtonBounds: Rect;
  sortIconMatrix: SwfMatrix;
  statistics: {
    background: { bounds: Rect; stops: { ratio: number; color: number[] }[] };
    closed: Rect;
    frames: { age: number; mask: Rect }[];
  };
};
const viewerFrameCounts = new Map<number, number>();
for (const w of TANK_VIEWER.widgets)
  viewerFrameCounts.set(w.symbol, Math.max(viewerFrameCounts.get(w.symbol) ?? 1, w.frame));
export const viewerWidget = (id: number, frame = 1) =>
  TANK_VIEWER.widgets.find(
    (w) => w.symbol === id && w.frame === Math.min(frame, viewerFrameCounts.get(id) ?? frame),
  )!;
export const viewerRoot = (name: string) => TANK_VIEWER.root.find((p) => p.name === name)!;
