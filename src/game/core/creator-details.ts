import type { Rect, TankPart } from './types';
import type { PartDefinition } from './types';
export interface CreatorDetailAnchor {
  id: number;
  rowY: number;
  alpha: number;
  selected: boolean;
}
export interface CreatorDetailFocus extends CreatorDetailAnchor {
  instance: number;
}
/** _-Gn bytecode tests >=2 AND >=3, making the later >=4 High branch unreachable. */
export function creatorComplexityLabel(bp: number) {
  return bp >= 3 ? 'Medium' : 'Low';
}
export function creatorClassRequirement(part: Pick<PartDefinition, 'classCost' | 'lower'>) {
  const c = part.classCost;
  return !c
    ? ''
    : part.lower
      ? c === 1
        ? 'Must be class 1.'
        : `Must be class ${c} or lower.`
      : c === 6
        ? 'Must be class 6.'
        : `Must be class ${c} or higher.`;
}
export function creatorDetailText(part: PartDefinition): Record<string, string> {
  return {
    name_txt: part.name,
    gunPoints_txt: String(part.gp),
    bubblePoints_txt: creatorComplexityLabel(part.bp),
    special_txt: creatorClassRequirement(part),
    damage_txt: part.damageText,
    summary_txt: part.summary,
    flavor_txt: part.flavor,
  };
}
export function creatorThumbnailScale(width: number, height: number) {
  const extent = Math.max(width, height);
  return extent > 48 ? 48 / extent : 1;
}

export interface CreatorWeaponIcon {
  key: string;
  type: number;
  x: number;
  y: number;
}
/** _-Vs reads the already-painted1px outline's bounds, including half a stroke at either edge. */
export function creatorWeaponIcons(
  parts: readonly TankPart[],
  keys: readonly string[],
  boxes: ReadonlyMap<string, Rect>,
): CreatorWeaponIcon[] {
  const byKey = new Map(parts.map((part) => [part.key, part]));
  return keys.flatMap((key) => {
    const part = byKey.get(key),
      box = boxes.get(key);
    if (!part || !box || (part.type >= 1000 && part.type <= 1999)) return [];
    // DisplayObject.x/y assign the corner through twentieth-pixel coordinates.
    return [
      {
        key,
        type: part.type,
        x: Math.trunc((box.x + box.width + 0.5) * 20) / 20,
        y: Math.trunc((box.y - 0.5) * 20) / 20,
      },
    ];
  });
}
export function creatorWeaponInfoText(part: PartDefinition): Record<string, string> {
  return {
    name_txt: part.name,
    gunPoints_txt: String(part.gp),
    bubblePoints_txt: String(part.bp),
    special_txt: creatorClassRequirement(part),
  };
}
