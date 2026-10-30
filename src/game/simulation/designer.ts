import { CLASS_PIXELS, CLASS_RINGS } from '../core/constants';
import { costs, gunBudget, partById } from '../data/catalog';
import { partUnlocked } from '../core/part-unlocks';
import type { TankDesign, TankPart } from '../core/types';
import { creatorSavePrerequisite } from '../core/creator-save';
// _-7q checks the rectangular selection area for classes 5/6; save validation
// separately checks the max-class ring for classes 1..5 (_-AA).
export function canPlacePart(part: TankPart, currentClass: number, maxClass: number) {
  if (currentClass >= 5) return Math.abs(part.x) <= 175 && Math.abs(part.y) <= 175;
  return partExtent(part) <= CLASS_RINGS[maxClass - 1];
}
function partExtent(part: TankPart) {
  return Math.hypot(part.x, part.y) + (part.type < 2000 ? part.radius * part.scale : 0);
}
export function classFromPixelCount(count: number) {
  return CLASS_PIXELS.findIndex((max) => count <= max) + 1;
}
export function validateBuild(
  design: TankDesign,
  level: number,
  maxClass: number,
  unlockedParts?: readonly number[],
) {
  const { gp, bp } = costs(design.parts),
    errors: string[] = [];
  const prerequisite = creatorSavePrerequisite(design);
  if (prerequisite) errors.push(prerequisite);
  if (design.classId > maxClass) errors.push(`This build exceeds class ${maxClass}.`);
  if (maxClass < 6 && design.parts.some((p) => partExtent(p) > CLASS_RINGS[maxClass - 1]))
    errors.push(`Place every part inside the class ${maxClass} ring.`);
  if (bp > 100) errors.push('Exceeds maximum complexity (100 BP).');
  const budget = design.avatar
    ? gunBudget(design.classId, level)
    : Math.floor(gunBudget(design.classId, 6) * 1.5);
  if (gp > budget) errors.push(`Not enough Gun Points: ${gp} / ${budget}.`);
  const behaviors = new Set(
    design.parts.filter((p) => p.type >= 6000 && p.type < 7000).map((p) => p.type),
  );
  if (behaviors.size > 1) errors.push('Use only one behavior type per tank.');
  for (const p of design.parts) {
    const def = partById(p.type);
    if (!def) continue;
    if (
      def.classCost &&
      (def.lower ? design.classId > def.classCost : design.classId < def.classCost)
    )
      errors.push(`${def.name} requires a ${def.lower ? 'smaller' : 'larger'} class.`);
    if (design.avatar && !partUnlocked(def.id, level, unlockedParts))
      errors.push(`${def.name} unlocks at tank level ${def.tier}.`);
  }
  return [...new Set(errors)];
}
export { creatorSuggestedStats as suggestedStats } from '../core/creator-enemy-stats';
