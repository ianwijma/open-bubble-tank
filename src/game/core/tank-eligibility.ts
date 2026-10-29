import type { TankDesign } from './types';
import { costs, gunBudget, partById } from '../data/catalog';

export interface TankLoadProfile {
  level: number;
  maxClass: number;
  /** When present, this is the profile's authoritative weapon/module unlock list. */
  unlockedParts?: readonly number[];
}
/** PlayerProfile._-0T/DoesProfileHaveAllThePartsForTank and the normal _-cL labels. */
export function tankLoadEligibility(tank: TankDesign, profile: TankLoadProfile) {
  const baseBudget = gunBudget(tank.classId, tank.avatar ? profile.level : 6),
    budget = tank.avatar ? baseBudget : Math.floor(baseBudget * 1.5),
    classLimit = tank.avatar ? profile.maxClass : 6,
    overGunPoints = costs(tank.parts).gp > budget,
    overClass = tank.classId > classLimit,
    missingParts = tank.parts.some((p) => {
      if (p.type >= 1000 && p.type <= 1999) return false;
      return profile.unlockedParts
        ? !profile.unlockedParts.includes(p.type)
        : (partById(p.type)?.tier ?? Infinity) > profile.level;
    });
  return {
    budget,
    classLimit,
    overGunPoints,
    overClass,
    missingParts,
    capacityLabel: [overGunPoints ? 'Gun Points' : '', overClass ? 'Class' : '']
      .filter(Boolean)
      .join(', '),
  };
}
