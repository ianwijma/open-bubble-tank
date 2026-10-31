import type { TankPart } from '../core/types';
import { CLASS_RINGS } from '../core/constants';
import { costs, partById } from '../data/catalog';

export type CreatorEditError = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const CREATOR_EDIT_ERRORS = {
  1: 'Excedes maximum tank size',
  2: 'Not enough Gun Points!',
  3: 'Your parts require a smaller class.',
  4: 'Your parts require a larger class.',
  5: 'Excedes your maximum class.',
  6: 'Excedes max complexity.',
  7: 'You may only place one type of Behavior Part.',
} as const;

/** TankCreatorScreen._-6k; caller supplies the retained UpdateClass/budget values. */
export function creatorEditError(
  parts: readonly TankPart[],
  classId: number,
  maxClass: number,
  budget: number,
): CreatorEditError {
  const total = costs(parts);
  if (Math.max(0, total.bp) > 100) return 6;
  if (maxClass < 6 && classId > maxClass) return 1;
  if (((budget - Math.max(0, total.gp)) | 0) < 0) return 2;
  if (classId > maxClass) return 5;
  let behavior: number | undefined;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.type >= 1000 && part.type <= 1999) continue;
    const def = partById(part.type);
    if (def?.classCost) {
      if (def.lower && classId > def.classCost) return 3;
      if (!def.lower && classId < def.classCost) return 4;
    }
    // Pcode ofs00e9..ofs012c: duplicate instances are allowed; distinct types fail.
    if (part.type > 6000 && part.type < 7000) {
      if (behavior !== undefined && behavior !== part.type) return 7;
      behavior = part.type;
    }
  }
  // _-6k builds only five radii. Index5 is undefined/NaN, so class6 has no final radial gate.
  const radius = maxClass < 6 ? CLASS_RINGS[maxClass - 1] : undefined;
  if (radius !== undefined)
    for (const part of parts) {
      let extent = Math.hypot(part.x, part.y);
      if (part.type >= 1000 && part.type <= 1999) extent += part.radius * part.scale;
      if (extent > radius) return 1;
    }
  return 0;
}
