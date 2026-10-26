import { angleTo, length } from '../core/math';
import type { InputFrame, Tank, Vec } from '../core/types';
import { STAGE } from '../core/constants';

/** _-KM._-Uo, including its positive/negative exact-opposite tie choices. */
export function movementTurn(rotation: number, velocity: Vec) {
  const target = angleTo({ x: 0, y: 0 }, velocity),
    step = length(velocity) / 4;
  if (rotation >= 0) {
    const opposite = rotation - 180;
    if (target < rotation && target > opposite) return Math.max(-step, target - rotation);
    return target >= 0 && target !== opposite ? Math.min(step, target - rotation) : step;
  }
  const opposite = rotation + 180;
  if (target < opposite && target > rotation) return Math.min(step, target - rotation);
  return target < 0 ? Math.max(-step, target - rotation) : -step;
}

/** AvatarInterface.ControlAvatarDirection runs before acceleration and even in state2. */
export function controlPlayerDirection(tank: Tank, input: InputFrame) {
  if (tank.design.classId <= 3)
    tank.rotation = angleTo(
      { x: 0, y: 0 },
      { x: input.aim.x - STAGE.cx, y: input.aim.y - STAGE.cy },
    );
  else {
    tank.rotation += movementTurn(tank.rotation, tank.velocity);
    // Flash DisplayObject.rotation normalizes when assigned.
    while (tank.rotation > 180) tank.rotation -= 360;
    while (tank.rotation < -180) tank.rotation += 360;
  }
}
