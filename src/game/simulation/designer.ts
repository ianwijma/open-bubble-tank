import { CLASS_PIXELS, CLASS_RINGS } from '../core/constants';
import { costs, gunBudget, partById } from '../data/catalog';
import type { TankDesign, TankPart } from '../core/types';
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
export function validateBuild(design: TankDesign, level: number, maxClass: number) {
  const { gp, bp } = costs(design.parts),
    errors: string[] = [];
  if (!design.parts.some((p) => p.type < 2000))
    errors.push('Your tank needs at least one body bubble.');
  if (
    design.avatar &&
    !design.parts.some((p) => Math.floor(p.type / 1000) === 2 || Math.floor(p.type / 1000) === 3)
  )
    errors.push('Your avatar needs at least one weapon.');
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
    if (design.avatar && def.tier > level)
      errors.push(`${def.name} unlocks at tank level ${def.tier}.`);
  }
  return [...new Set(errors)];
}
export function suggestedStats(design: TankDesign) {
  const { gp, bp } = costs(design.parts),
    c = design.classId;
  const life = Math.max(1, Math.round((bp / 2 + gp * 3) * c));
  const reward = Math.max(
    1,
    Math.round(life * (0.3 * ((7 - c) / 6) + 0.005 * gp + 0.1 - Math.min(0.1, 0.0005 * life))),
  );
  const speed = Math.max(0.1, Math.floor((3 * ((6 - c) / 6) + 0.5 - gp * 0.1) * 100) / 100);
  return { life, reward, speed };
}
