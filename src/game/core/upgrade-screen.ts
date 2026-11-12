import geometry from '../data/upgrade-screen.json';
import type { CreatorPrimitive } from './creator-controls';
import type { CreatorField } from './creator-palette';
import type { SwfMatrix } from '../assets/asset-pack';
import type { Rect, TankDesign, TankPart } from './types';
import { partById } from '../data/catalog';
import { displayPixel } from './display-values';

export interface UpgradePiece {
  name: string;
  symbol: number;
  matrix: SwfMatrix;
  bounds: Rect;
}
export interface UpgradeWidget {
  symbol: number;
  frame: number;
  leaf: boolean;
  staticDepths: number[];
  art: CreatorPrimitive[];
  fields: (CreatorField & { matrix: SwfMatrix })[];
}
export const UPGRADE_SCREEN = geometry as {
  symbol: number;
  shade: UpgradePiece;
  foreground: UpgradePiece[];
  viewers: { matrix: SwfMatrix; cards: UpgradePiece[] };
  edit: UpgradePiece;
  preview: { width: number; height: number };
  widgets: UpgradeWidget[];
  omitted: string[];
};
export const upgradeWidget = (symbol: number, frame = 1) =>
  UPGRADE_SCREEN.widgets.find((widget) => widget.symbol === symbol && widget.frame === frame)!;

/** _-Bz/_-Wp: sort each category, abbreviate3+ distinct types, retain failed substr trims. */
export function upgradeWeaponSummary(tank: TankDesign, category: 2 | 3 | 5) {
  const counts = new Map<number, number>();
  for (const part of tank.parts)
    if (Math.floor(part.type / 1000) === category)
      counts.set(part.type, (counts.get(part.type) ?? 0) + 1);
  if (!counts.size) return 'N/A';
  return [...counts]
    .sort(([a], [b]) => a - b)
    .map(([id, count]) => {
      const part = partById(id);
      const name = counts.size > 2 ? part?.shortName : count === 1 ? part?.name : part?.pluralName;
      return `${count} ${name ?? ''}, `;
    })
    .join('');
}

/** _-aG recenters available adjacent-class slots after removing their unavailable siblings. */
export function upgradeCardMatrix(index: number, count: number): SwfMatrix {
  const card = UPGRADE_SCREEN.viewers.cards[index];
  const spacing =
    (UPGRADE_SCREEN.viewers.cards[1].matrix.tx - UPGRADE_SCREEN.viewers.cards[0].matrix.tx) / 20;
  return { ...card.matrix, tx: card.matrix.tx + (((3 - count) * spacing) / 2) * 20 };
}

export function upgradePartBounds(part: TankPart, bounds: Rect): Rect {
  const angle = (part.rotation * Math.PI) / 180,
    c = Math.cos(angle) * part.scale,
    s = Math.sin(angle) * part.scale;
  const corners = [bounds.x, bounds.x + bounds.width].flatMap((x) =>
    [bounds.y, bounds.y + bounds.height].map((y) => ({
      x: part.x + x * c - y * s,
      y: part.y + x * s + y * c,
    })),
  );
  const x = Math.min(...corners.map((point) => point.x)),
    y = Math.min(...corners.map((point) => point.y));
  return {
    x,
    y,
    width: Math.max(...corners.map((point) => point.x)) - x,
    height: Math.max(...corners.map((point) => point.y)) - y,
  };
}

/** Upgrade previews have no LoadingBox helpers, never enlarge, and center their actual bounds. */
export function upgradePreviewPlacement(boxes: readonly Rect[]) {
  if (!boxes.length) return { scale: 1, x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map((box) => box.x)),
    y = Math.min(...boxes.map((box) => box.y));
  const width = Math.max(...boxes.map((box) => box.x + box.width)) - x;
  const height = Math.max(...boxes.map((box) => box.y + box.height)) - y;
  const scale = Math.min(
    1,
    width > 0 ? UPGRADE_SCREEN.preview.width / width : 1,
    height > 0 ? UPGRADE_SCREEN.preview.height / height : 1,
  );
  return {
    scale,
    x: displayPixel(-(x + width / 2) * scale),
    y: displayPixel(-(y + height / 2) * scale),
    width: width * scale,
    height: height * scale,
  };
}
