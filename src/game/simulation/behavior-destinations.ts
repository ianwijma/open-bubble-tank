import type { Vec, WallFlowerState } from '../core/types';
import type { Random } from '../core/math';
import { actorAngle, actorDirection, actorHeading, type MovingActor } from './actor-movement';

export const createWallFlower = (rng: Random): WallFlowerState => ({
  age: 0,
  frequency: rng.int(2, 10) / 100,
  amplitude: rng.int(10, 20),
});
const length = (v: Vec) => Math.sqrt(v.x * v.x + v.y * v.y);
/** Aggressor/Healer's inherited behavior consumes an already validated/projected point. */
export function setPursuitPoint(tank: MovingActor, point: Vec | null) {
  tank.movement.swarmPoint = point && { ...point };
}
/** Setup sets this flag before the first active BehaviorRun. */
export function setupSkittish(tank: MovingActor) {
  tank.movement.skittish = true;
}
export function tickSkittish(tank: MovingActor, point: Vec | null, rng: Random) {
  if (!point || length({ x: point.x - tank.x, y: point.y - tank.y }) > 600) {
    tank.movement.swarmPoint = null;
    return;
  }
  const heading = actorHeading(tank, point);
  let facing = heading - tank.rotation;
  // Source's positive wrap writes another local, leaving this facing value unchanged.
  if (facing < -180) facing += 360;
  if (Math.abs(facing) > 90) return;
  const outward = actorAngle(actorHeading({ x: 0, y: 0 }, tank) - tank.rotation),
    offset = rng.int(90, 110);
  tank.movement.swarmPoint = actorDirection(heading + (outward > 0 ? offset : -offset), 700);
}
export function tickWallFlower(tank: MovingActor, state: WallFlowerState, fieldScale: number) {
  if (!state.point) {
    tank.movement.wallFlower = true;
    if (tank.x === 0 && tank.y === 0) tank.x = 1;
    state.radius = 424 * fieldScale - tank.radius;
    const factor = state.radius / length(tank);
    state.point = { x: tank.x * factor, y: tank.y * factor };
    state.direction =
      actorAngle(actorHeading({ x: 0, y: 0 }, state.point) - tank.rotation) < 0 ? 1 : -1;
    tank.movement.swarmPoint = { ...state.point };
    return;
  }
  state.age = (state.age + 1) | 0;
  const dx = state.point.x - tank.x,
    dy = state.point.y - tank.y;
  if (dx * dx + dy * dy > Math.pow(30 + tank.radius, 2)) return;
  state.point = actorDirection(
    actorHeading({ x: 0, y: 0 }, state.point) + state.direction!,
    state.radius! - Math.sin(state.frequency * state.age) * state.amplitude,
  );
  tank.movement.swarmPoint = { ...state.point };
}
