import data from '../data/tank-viewer.json';
import type { CreatorField } from './creator-palette';
import type { CreatorPrimitive } from './creator-controls';
import type { SwfMatrix } from '../assets/asset-pack';
import type { Rect, TankDesign } from './types';
import { AVATARS, ENEMIES, costs, partById } from '../data/catalog';
import { infoWeapons } from './tank-info';
import { tankLoadEligibility, type TankLoadProfile } from './tank-eligibility';
import { viewerTankIdentity } from './viewer-storage';
export interface ViewerField extends CreatorField {
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
  rejection: {
    symbol: number;
    x: number;
    y: number;
    frameCount: number;
    fields: ViewerField[];
    fieldIndex: number;
    pieces: { symbol: number; index: number; matrix: SwfMatrix; art: CreatorPrimitive[] }[];
    frames: number[][];
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
export function localViewerTanks(tanks: readonly TankDesign[], avatar: boolean) {
  const seen = new Set<string>();
  return [...(avatar ? AVATARS : ENEMIES), ...tanks].filter((tank) => {
    if (tank.avatar !== avatar) return false;
    const identity = viewerTankIdentity(tank);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
export type ViewerSort = 'name' | 'author' | 'classId' | 'guns' | 'bubbles';
export function sortViewerTanks(tanks: readonly TankDesign[], sort: ViewerSort) {
  const value = (t: TankDesign) =>
    sort === 'guns' ? costs(t.parts).gp : sort === 'bubbles' ? costs(t.parts).bp : t[sort];
  return tanks
    .map((tank, index) => ({ tank, index }))
    .sort((a, b) => {
      const x = value(a.tank),
        y = value(b.tank);
      const order =
        typeof x === 'string' && typeof y === 'string'
          ? x.toLowerCase() < y.toLowerCase()
            ? -1
            : x.toLowerCase() > y.toLowerCase()
              ? 1
              : 0
          : Number(x) - Number(y);
      return order || a.index - b.index;
    })
    .map((p) => p.tank);
}
export interface ViewerLimits extends TankLoadProfile {
  /** Current-points readout; selection uses the loaded tank's class-specific budget. */
  gunPoints: number;
}
export function viewerSelectionError(tank: TankDesign, avatar: boolean, limits: ViewerLimits) {
  if (!avatar) return '';
  const { overGunPoints, overClass, missingParts, capacityLabel } = tankLoadEligibility(
      tank,
      limits,
    ),
    over = overGunPoints || overClass;
  return missingParts
    ? over
      ? `Do not have the parts and exceeds ${capacityLabel}`
      : 'Do not have all the parts for this tank'
    : over
      ? `Exceeds your ${capacityLabel}`
      : '';
}
export function viewerPartSummary(tank: TankDesign) {
  const counts = new Map<string, number>();
  for (const p of tank.parts) {
    const name = partById(p.type)?.name ?? String(p.type);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => `${count} x ${name}\n`).join('');
}
export function viewerEquipmentFields(tank: TankDesign) {
  const c = costs(tank.parts);
  return {
    bubblesLeft_txt: String(c.bp),
    gunPoints_txt: String(c.gp),
    class_txt: String(tank.classId),
    PrimarySecondary_txt: tank.avatar
      ? 'Primary Weapons:\n\n\n\nSecondary Weapons:\n\n\n\nPassive Weapons:'
      : 'Enemy Weapons:\n\n\n\nBehavior Parts:',
    primary_txt: infoWeapons(tank, tank.avatar ? 2 : 4),
    secondary_txt: infoWeapons(tank, tank.avatar ? 3 : 6),
    passive_txt: tank.avatar ? infoWeapons(tank, 5) : '',
  };
}
/** TankLoadingBox.Setup's fit includes five invisible13px helpers at the extreme mount positions. */
export function viewerFit(
  tank: TankDesign,
  boxes: readonly Rect[],
  width = TANK_VIEWER.rowBounds.width - 50,
  height = TANK_VIEWER.rowBounds.height - 80,
) {
  const x = Math.max(0, ...tank.parts.map((p) => Math.abs(p.x))),
    y = Math.max(0, ...tank.parts.map((p) => Math.abs(p.y))),
    h = TANK_VIEWER.helper;
  const all = [
    ...boxes,
    ...[
      { x: 0, y: 0 },
      { x, y: 0 },
      { x: -x, y: 0 },
      { x: 0, y },
      { x: 0, y: -y },
    ].map((p) => ({ ...h, x: h.x + p.x, y: h.y + p.y })),
  ];
  const w = Math.max(...all.map((b) => b.x + b.width)) - Math.min(...all.map((b) => b.x)),
    v = Math.max(...all.map((b) => b.y + b.height)) - Math.min(...all.map((b) => b.y));
  return Math.min(1, width / w, height / v);
}
