import type { Tank, Vec } from '../core/types';
import type { World } from './world';

export function attachedTarget(world: World, uid: number | null | undefined) {
  return [
    world.player,
    ...world.activeFields().flatMap(({ field, runtime }) => [...field.enemies, ...runtime.allies]),
  ].find((t) => t.uid === uid);
}
/** Behavior target points are transformed between parents, including both transit populations. */
export function actorTargetPoint(world: World, target: Tank): Vec {
  if (target === world.player) return { x: target.x, y: target.y }; // inField already projects it.
  const fields = world.activeFields(),
    parent = fields.find(
      ({ field, runtime }) => field.enemies.includes(target) || runtime.allies.includes(target),
    ),
    owner = fields.find(({ field }) => field === world.field);
  return {
    x: target.x + (parent?.offset.x ?? 0) - (owner?.offset.x ?? 0),
    y: target.y + (parent?.offset.y ?? 0) - (owner?.offset.y ?? 0),
  };
}
