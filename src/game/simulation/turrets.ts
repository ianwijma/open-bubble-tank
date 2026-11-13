import { projectileOutside } from './projectile-boundary';
import { direction, distance } from '../core/math';
import { displayPixel } from '../core/display-values';
import { actorAngle, actorHeading } from './actor-movement';
import type { GunState, Projectile, Tank } from '../core/types';
import type { World } from './world';
import { projectileImpact } from './effects';
import { projectileCallback } from './projectile-contact';
import { collisionSound } from './collision-sound';
import { attachTurretShield, removeTurretShield } from './shields';

/** Observed original EnemyAim raises #1069 for the cached avatar's missing inner_mc. */
export class TurretTargetReadError extends Error {
  constructor() {
    super('Shield Turrets target has no inner_mc (#1069)');
  }
}

/** _-DO.Run polls physical parents, then aims, before PartCallRun. */
export function tickTurretBehavior(world: World, owner: Tank, gun: GunState) {
  const wasShielded = owner.shield > 0;
  owner.shield = 0;
  gun.turretRefs = (gun.turretRefs ?? []).filter((turret) => world.hasBulletParent(turret));
  for (const turret of gun.turretRefs) {
    if ((turret.build ?? 1) !== 4) continue;
    owner.shield = 1;
    owner.shieldManaged = true;
    if (!owner.shieldHitClip) attachTurretShield(owner, gun);
  }
  if (wasShielded && owner.shield === 0) removeTurretShield(owner, gun);
  let target = gun.turretTarget;
  if (
    !target ||
    !('kind' in target ? world.hasBulletParent(target) : world.actorParents.hasParent(target))
  ) {
    gun.turretTarget = null;
    target = undefined;
  }
  if (target && !('kind' in target)) throw new TurretTargetReadError();
  if (target && (target.build ?? 1) === 4) {
    gun.turretTarget = null;
    target = undefined;
  }
  const mount = world.actorParents.localToGlobal(owner, gun.part);
  if (target) {
    const point = world.bulletGlobal(target);
    if (!point) throw new Error('Parented turret has no retained layer transform');
    gun.angle = actorAngle(actorHeading(mount, point) - owner.rotation);
  } else {
    const point = world.actorParents.fieldLocal(mount, world.currentWrapper);
    if (!point) throw new Error('Turret mount has no current field transform');
    const scale = -world.rng.next();
    gun.angle = actorAngle(
      (360 * Math.atan2(point.y * scale, point.x * scale)) / (2 * Math.PI) - owner.rotation,
    );
  }
}

function movement(bullet: Projectile) {
  if (bullet.deflected) return bullet.deflected;
  if (['beam', 'healBeam', 'whip'].includes(bullet.kind)) return { x: 0, y: 0 };
  return bullet.kind === 'turret'
    ? (bullet.motion ?? direction(bullet.angle, bullet.speed))
    : direction(bullet.angle, bullet.speed);
}

/** EnemyTurret/EnemyTurretBuilder test both masks at the current and relative half-step. */
function touches(world: World, a: Projectile, b: Projectile) {
  const am = movement(a),
    bm = movement(b);
  const dx = (am.x + bm.x) / 2,
    dy = (am.y + bm.y) / 2;
  return (
    world.hitProjectile(a, b.x, b.y) ||
    world.hitProjectile(a, b.x - dx, b.y - dy) ||
    world.hitProjectile(b, a.x, a.y) ||
    world.hitProjectile(b, a.x - dx, a.y - dy)
  );
}

export function tickTurret(world: World, turret: Projectile) {
  const owner = turret.turretHome;
  if (!owner || !world.actorParents.hasParent(owner)) {
    turret.dead = true;
    projectileImpact(world, turret);
    return;
  }
  turret.artFrame = turret.build ?? 1;
  for (const shot of world.bullets) {
    if (shot.dead || shot.enemy === turret.enemy || !touches(world, turret, shot)) continue;
    turret.health = (turret.health ?? 10) - shot.damage;
    projectileCallback(world, shot, turret, turret.enemy);
    // _-BL.blnBeam starts true for every shipped class; this contact leaves the shot alive.
    if (turret.health <= 0) {
      turret.dead = true;
      projectileImpact(world, turret);
      collisionSound(world, turret, false);
      return;
    }
  }
  if (turret.stopped) return;
  if (projectileOutside(world, turret)) {
    turret.dead = true;
    projectileImpact(world, turret);
    return;
  }
  const speed = 10 * (1 - distance(turret, turret.origin ?? turret) / 200);
  if (speed >= 0.4) turret.motion = direction(turret.angle, speed);
  else turret.stopped = true;
  // SetMovement keeps the preceding velocity on the frame it switches off.
  turret.x = displayPixel(turret.x + (turret.motion?.x ?? 0));
  turret.y = displayPixel(turret.y + (turret.motion?.y ?? 0));
}

export function builderHitsObject(world: World, builder: Projectile) {
  const half = direction(builder.angle, builder.speed / 2);
  if (
    [world.player, ...world.allies].some(
      (tank) =>
        !tank.dead &&
        (world.hitTest(tank, builder.x, builder.y) ||
          world.hitTest(tank, builder.x - half.x, builder.y - half.y)),
    )
  ) {
    builder.dead = true;
    projectileImpact(world, builder);
    collisionSound(world, builder);
    return true;
  }
  const contact = world.bullets.find(
    (other) => other !== builder && !other.dead && touches(world, builder, other),
  );
  if (!contact) return false;
  if (contact.kind === 'turret') {
    contact.build = Math.min(4, (contact.build ?? 1) + 1);
    contact.artFrame = contact.build;
  }
  builder.dead = true;
  projectileImpact(world, builder);
  collisionSound(world, builder);
  return true;
}
