import { rotate } from '../core/math';
import type { Tank, TankDesign, Vec } from '../core/types';

const points = new WeakMap<TankDesign, Vec>();

/** TankData.GetClosestDetailToCenterPoint includes every detail and retains the first tie. */
export function tankHitLocation(tank: Tank): Vec {
  let point = points.get(tank.design);
  if (!point) {
    let best = 999999999999;
    point = { x: 0, y: 0 };
    for (const part of tank.design.parts) {
      const d = part.x * part.x + part.y * part.y;
      if (d < best) {
        best = d;
        point = { x: part.x, y: part.y };
      }
    }
    points.set(tank.design, point);
  }
  const offset = rotate(point, tank.rotation);
  return { x: tank.x + offset.x, y: tank.y + offset.y };
}
