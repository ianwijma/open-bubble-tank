import partData from './parts.json';
import tankData from './tanks.json';
import type { PartDefinition, TankDesign, TankPart } from '../core/types';
import { GUN_BUDGET } from '../core/constants';
export const PARTS: readonly PartDefinition[] = partData;
export const PART_BY_ID = new Map(PARTS.map((p) => [p.id, p]));
export function partById(id: number) {
  return PART_BY_ID.get(id === 2013 ? 5003 : id);
}
export const AVATARS: readonly TankDesign[] = tankData.avatar_defaults;
export const ENEMIES: readonly TankDesign[] = tankData.enemy_tanks;
export const BOSSES: readonly TankDesign[] = tankData.bosses;
export const STARTER = AVATARS[0];
export function costs(parts: readonly TankPart[]) {
  return parts.reduce(
    (v, p) => ({ bp: v.bp + (partById(p.type)?.bp ?? 0), gp: v.gp + (partById(p.type)?.gp ?? 0) }),
    { bp: 0, gp: 0 },
  );
}
export function tankRadius(design: TankDesign) {
  return Math.max(10, ...design.parts.map((p) => Math.hypot(p.x, p.y) + p.radius));
}
export function gunBudget(classId: number, level: number) {
  return GUN_BUDGET[classId - 1]?.[Math.max(0, level - 1)] ?? 0;
}
export function isSupport(t: TankDesign) {
  return t.parts.some((p) => [4003, 4024, 6002].includes(p.type));
}
export function difficulty(t: TankDesign) {
  return Math.round(
    (1 / (5 - t.speed) + 1) * (costs(t.parts).gp / 2 - 0.2) +
      Math.sqrt(t.life) / 10 -
      t.reward / t.life +
      0.4,
  );
}
