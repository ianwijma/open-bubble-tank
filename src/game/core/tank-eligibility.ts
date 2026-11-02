import type { TankDesign } from './types';
import { costs, gunBudget } from '../data/catalog';
import { partUnlocked } from './part-unlocks';

export interface TankLoadProfile {
  level: number;
  /** Creator cap and legacy readout fallback; avatar selection derives its cap from level. */
  maxClass: number;
  /** Stored PlayerProfile.maxClass, distinct from the current-level validation limit. */
  profileMaxClass?: number;
  /** When present, this is the profile's authoritative weapon/module unlock list. */
  unlockedParts?: readonly number[];
}
/** PlayerProfile._-0T/DoesProfileHaveAllThePartsForTank and the normal _-cL labels. */
export function tankLoadEligibility(tank: TankDesign, profile: TankLoadProfile) {
  const baseBudget = gunBudget(tank.classId, tank.avatar ? profile.level : 6),
    budget = tank.avatar ? baseBudget : Math.floor(baseBudget * 1.5),
    classLimit = tank.avatar ? Math.min(6, profile.level + 1) : 6,
    overGunPoints = costs(tank.parts).gp > budget,
    overClass = tank.classId > classLimit,
    missingParts = tank.parts.some((p) => {
      if (p.type >= 1000 && p.type <= 1999) return false;
      return !partUnlocked(p.type, profile.level, profile.unlockedParts);
    });
  return {
    budget,
    classLimit,
    overGunPoints,
    overClass,
    missingParts,
    capacityLabel: [
      overGunPoints ? 'Gun Points' : '',
      tank.classId > (profile.profileMaxClass ?? profile.maxClass) ? 'Class' : '',
    ]
      .filter(Boolean)
      .join(', '),
  };
}
