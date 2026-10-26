import type { TankPart, Vec } from '../core/types';
import { canPlacePart } from './designer';
import { removeParts } from './editor-selection';

/** TankCreatorScreen._-8a snaps every new object, even in asymmetric mode. */
export function placementParts(
  type: number,
  radius: number,
  point: Vec,
  symmetric: boolean,
  key: string,
): TankPart[] {
  const y = Math.abs(point.y) <= 3 ? 0 : point.y;
  const twin = symmetric && y !== 0 ? `${key}-twin` : '';
  const part: TankPart = { key, type, radius, x: point.x, y, rotation: 0, scale: 1, twin };
  return twin ? [part, { ...part, key: twin, twin: key, y: -y }] : [part];
}
/** _-ZW checks each new member separately, breaking a rejected twin's link. */
export function acceptedPlacement(parts: TankPart[], currentClass: number, maxClass: number) {
  return removeParts(
    parts,
    parts.filter((p) => !validPlacement(p, currentClass, maxClass)).map((p) => p.key),
  );
}
export function validPlacement(part: TankPart, currentClass: number, maxClass: number) {
  return (
    Math.abs(part.x) <= 175 && Math.abs(part.y) <= 175 && canPlacePart(part, currentClass, maxClass)
  );
}
