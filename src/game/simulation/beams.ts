import { FIELD_RADIUS } from '../core/constants';
import { direction, length } from '../core/math';
import { displayPixel } from '../core/display-values';
import type { GunState, Projectile, Tank, Vec } from '../core/types';
import type { World } from './world';
import { actorAngle, actorDirection, actorHeading } from './actor-movement';
import { createProjectile } from './create-projectile';

/** ABeamCannon keeps beam_mc even when SpawnNewBullet declines or its parent is removed. */
export function stopDamageBeam(world: World, gun: GunState) {
  const beam = gun.beamRef;
  if (beam && world.removeBullet(beam, world.currentWrapper)) beam.dead = true;
  gun.beamRef = undefined;
  gun.beamId = undefined;
}

export function fireDamageBeam(world: World, owner: Tank, gun: GunState) {
  if ((owner !== world.player && !world.actorParents.hasParent(owner)) || owner.status.jam > 0) {
    stopDamageBeam(world, gun);
    return;
  }
  const origin = world.muzzle(owner, gun),
    angle = actorAngle(owner.rotation + gun.angle);
  if (gun.beamRef) {
    gun.beamRef.x = displayPixel(origin.x);
    gun.beamRef.y = displayPixel(origin.y);
    gun.beamRef.angle = angle;
    return;
  }
  const beam = createProjectile(world.nextId(), {
    owner: owner.uid,
    enemy: false,
    kind: 'beam',
    symbol: 1992,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 1,
    anchor: gun,
    partType: 2017,
    contactFrames: 0,
    // Keep the existing accepted-shot entropy adapter pending constructor evidence.
    orbit: world.transit ? 0 : world.rng.int(0, 359),
  });
  gun.beamRef = beam;
  gun.beamId = beam.uid;
  world.addBullet(beam, owner, undefined, () => {
    beam.x = origin.x;
    beam.y = origin.y;
    beam.angle = beam.heading = angle;
  });
}

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
  const origin = world.bulletGlobal(beam);
  if (!origin) return;
  const radius = FIELD_RADIUS * world.field.scale,
    unit = actorDirection(beam.angle, 1);
  let min = 99999,
    max = -1;
  const candidates = targets.filter((tank) => {
    const point = world.actorParents.localToGlobal(tank, { x: 0, y: 0 }),
      dx = point.x - origin.x,
      dy = point.y - origin.y,
      distance = Math.sqrt(dx * dx + dy * dy),
      angle = actorAngle(actorHeading(origin, point) - beam.angle);
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
  for (let n = candidates.length ? min | 0 : 0; n < radius * 2; n += 6) {
    const global = { x: origin.x + unit.x * n, y: origin.y + unit.y * n },
      local = world.actorParents.fieldLocal(global, world.field)!;
    beam.beamLength = n;
    if (Math.hypot(local.x, local.y) > radius) {
      beam.beamLength = Math.max(0, n - 5);
      break;
    }
    if (n > max) candidates.length = 0;
    for (let index = 0; index < candidates.length; index++) {
      const tank = candidates[index],
        point = world.actorParents.localToGlobal(tank, { x: 0, y: 0 });
      if (!world.hitTest(tank, global.x - point.x + tank.x, global.y - point.y + tank.y)) continue;
      // Qualified pcode uses _-W.arrEnemies[index], NOT the filtered contact actor.
      const raw = targets[index],
        rawPoint = world.actorParents.localToGlobal(raw, { x: 0, y: 0 }),
        carrier = raw.guns.find(
          (gun) =>
            gun.part.type === 4013 &&
            world.hitPart(
              raw,
              gun.part,
              global.x - rawPoint.x + raw.x,
              global.y - rawPoint.y + raw.y,
            ),
        );
      if (carrier) world.releaseCarrier(raw, carrier);
      else if ((beam.contactFrames = (beam.contactFrames ?? 0) + 1) === 2) {
        world.damage(tank, beam.damage, beam);
        beam.contactFrames = 0;
      }
      return;
    }
  }
}
