import type { SwfGlowFilter } from '../assets/asset-pack';
import type { TankDesign } from './types';
import type { ViewerLimits } from './tank-viewer';
import { costs, gunBudget, partById } from '../data/catalog';

/** HighlightTanks: new GlowFilter(0xffffff, 0.1, 28, 28, 3, 3). */
export const VIEWER_HOVER_GLOW: SwfGlowFilter = {
  kind: 'glow',
  color: [255, 255, 255, 25.5],
  blurX: 28,
  blurY: 28,
  strength: 3,
  passes: 3,
  inner: false,
  knockout: false,
  compositeSource: true,
};
/** TankLoadingBox.Setup: capacity and unlocked non-body parts, including enemy warning checks. */
export function viewerCardWarning(tank: TankDesign, limits: ViewerLimits) {
  const budget = gunBudget(tank.classId, tank.avatar ? limits.level : 6);
  return (
    costs(tank.parts).gp > (tank.avatar ? budget : Math.floor(budget * 1.5)) ||
    tank.classId > (tank.avatar ? limits.maxClass : 6) ||
    tank.parts.some(
      (p) =>
        !(p.type >= 1000 && p.type <= 1999) && (partById(p.type)?.tier ?? Infinity) > limits.level,
    )
  );
}
export interface ViewerHighlight {
  instance: string | null;
  lines: boolean;
  glow: boolean;
  caution: number;
  warning: boolean;
}
/** Persistent TankLoadingBox slots; previews are replaced independently of their line clips. */
export class ViewerHighlights {
  readonly rows: ViewerHighlight[] = Array.from({ length: 4 }, () => ({
    instance: null,
    lines: false,
    glow: false,
    caution: 0,
    warning: false,
  }));
  setup(index: number, instance: string | null, warning: boolean) {
    const row = this.rows[index];
    if (row.instance !== instance) {
      row.instance = instance;
      row.caution = 0;
      row.glow = false;
    }
    row.warning = warning;
  }
  clear(index: number) {
    this.rows[index].lines = this.rows[index].glow = false;
  }
  step(hits: readonly boolean[], active = true) {
    if (!active) return;
    this.rows.forEach((row, index) => {
      if (!row.instance) return;
      if (hits[index]) {
        if (!row.lines) row.lines = row.glow = true;
        // Preserve the source comparisons/additions, including floating-point overshoot.
        if (row.warning && row.caution < 0.9) row.caution += 0.05;
      } else {
        if (row.lines) row.lines = row.glow = false;
        if (row.caution > 0) row.caution -= 0.1;
      }
    });
  }
}
