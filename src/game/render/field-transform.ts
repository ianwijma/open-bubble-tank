import type { Field, Vec } from '../core/types';
import type { World } from '../simulation/world';

export interface FieldTransform extends Vec {
  scale: number;
}
/** Field translation is outside its shrink; destination fields keep their own transform. */
export function fieldTransform(
  world: World,
  field: Field,
  offset: Vec = { x: 0, y: 0 },
): FieldTransform {
  return { ...offset, scale: world.collapse?.field === field ? 1 - world.collapse.age / 204 : 1 };
}
export function fieldPoint<T extends Vec>(point: T, transform: FieldTransform): T {
  return transform.x || transform.y || transform.scale !== 1
    ? {
        ...point,
        x: transform.x + point.x * transform.scale,
        y: transform.y + point.y * transform.scale,
      }
    : point;
}
