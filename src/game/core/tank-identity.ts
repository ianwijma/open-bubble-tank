import type { TankDesign } from './types';

/** Source roster lookup compares the imported encrypted DATA, never a tank's ID alone. */
export function tankRosterIdentity(design: TankDesign): string {
  if (typeof design.sourceCode === 'string') return design.sourceCode;
  // JSON/mock designs have no original DATA. Use every serialized design/part field,
  // preserving part order while ignoring JavaScript object property insertion order.
  return JSON.stringify([
    design.id,
    design.name,
    design.author,
    design.avatar,
    design.classId,
    design.life,
    design.reward,
    design.speed,
    design.difficulty,
    design.parts.map((part) => [
      part.key,
      part.type,
      part.twin,
      part.x,
      part.y,
      part.rotation,
      part.scale,
      part.radius,
    ]),
  ]);
}
