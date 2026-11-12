import { GUN_BUDGET } from './constants';
import type { TankDesign } from './types';
import { costs, PART_BY_ID } from '../data/catalog';

/** PlayerProfile._-1Y caches this tier when an avatar enters its local library. */
export function avatarLibraryTier(tank: TankDesign) {
  const points = costs(tank.parts).gp;
  let tier = 0;
  for (const threshold of GUN_BUDGET[tank.classId - 1] ?? []) {
    if (points < threshold) break;
    ++tier;
  }
  // _-HM returns the zero-based _-JY row, unlike the one-based unlock level.
  // Its raw ID lookup also does not apply the renderer's legacy2013 alias.
  for (const part of tank.parts) tier = Math.max(tier, (PART_BY_ID.get(part.type)?.tier ?? 0) - 1);
  return tier;
}

/** UpgradeMenu._-96/SearchFailed preserve adjacent class order, including empty slots. */
export function upgradeClasses(currentClass: number) {
  return [currentClass - 1, currentClass, currentClass + 1].filter((id) => id > 0 && id < 7);
}

/** GetDefaultTank: exact class/GP/tier, newest matching profile record first. */
export function defaultUpgradeTank(library: readonly TankDesign[], classId: number, level: number) {
  const thresholds = GUN_BUDGET[classId - 1];
  if (!thresholds) return null;
  // The source stores int(arrGP[level - 1]); an absent level-zero entry becomes0.
  const budget = thresholds[level - 1] ?? 0;
  for (let index = library.length - 1; index >= 0; --index) {
    const tank = library[index];
    if (
      tank.avatar &&
      tank.classId === classId &&
      costs(tank.parts).gp === budget &&
      avatarLibraryTier(tank) === level
    )
      return tank;
  }
  return null;
}
