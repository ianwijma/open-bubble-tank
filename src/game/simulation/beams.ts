import { FIELD_RADIUS } from '../core/constants';
import { angleTo, deltaAngle, direction, length } from '../core/math';
import type { Projectile, Tank, Vec } from '../core/types';
import type { World } from './world';

/** Returns the first sampled point beyond the authored bubble wall. */
export function beamWallDistance(origin: Vec, angle: number, scale: number, step: number) {
  const unit = direction(angle),
    radius = FIELD_RADIUS * scale;
  let n = 0;
  for (; n < radius * 2; n += step)
    if (length({ x: origin.x + unit.x * n, y: origin.y + unit.y * n }) > radius) break;
  return n;
}

export function tickDamageBeam(world: World, beam: Projectile, targets: Tank[]) {
  const radius = FIELD_RADIUS * world.field.scale,
    unit = direction(beam.angle);
  let min = Infinity,
    max = -Infinity;
  const candidates = targets.filter((tank) => {
    if (tank.dead) return false;
    const distance = Math.hypot(tank.x - beam.x, tank.y - beam.y),
      angle = deltaAngle(beam.angle, angleTo(beam, tank));
    // _-CO._-GA uses a signed sine, so retain the asymmetric broad-phase filter.
    if (
      Math.abs(angle) > 90
        ? distance > tank.radius
        : Math.sin((angle * Math.PI) / 180) * distance > tank.radius
    )
      return false;
    min = Math.min(min, distance - tank.radius);
    max = Math.max(max, distance + tank.radius);
    return true;
  });
  // Every target shares this grid; starting a ray separately per target changes pixel hits.
  for (let n = candidates.length ? Math.trunc(min) : 0; n < radius * 2; n += 6) {
    const x = beam.x + unit.x * n,
      y = beam.y + unit.y * n;
    beam.beamLength = n;
    if (Math.hypot(x, y) > radius) {
      beam.beamLength = Math.max(0, n - 5);
      break;
    }
    const tank = n <= max ? candidates.find((tank) => world.hitTest(tank, x, y)) : undefined;
    if (!tank) continue;
    const carrier = tank.guns.find(
      (gun) => gun.part.type === 4013 && world.hitPart(tank, gun.part, x, y),
    );
    if (carrier) world.releaseCarrier(tank, carrier);
    else if ((beam.contactFrames = (beam.contactFrames ?? 0) + 1) === 2) {
      beam.contactFrames = 0;
      world.damage(tank, beam.damage, beam);
    }
    break;
  }
  beam.speed = beam.beamLength ?? 0;
}
