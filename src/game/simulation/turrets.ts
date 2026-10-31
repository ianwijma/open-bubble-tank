import { projectileOutside } from './projectile-boundary';
import { angleTo, direction, distance } from '../core/math';
import type { GunState, Projectile, Tank } from '../core/types';
import type { World } from './world';
import { projectileImpact } from './effects';
import { projectileCallback } from './projectile-contact';
import { attachTurretShield, removeTurretShield } from './shields';

/** _-DO.Run polls only its own attached turrets before aiming and PartCallRun. */
export function tickTurretBehavior(world: World, owner: Tank, gun: GunState) {
  const wasShielded = owner.shield > 0;
  owner.shield = 0;
  gun.turretRefs = (gun.turretRefs ?? []).filter((turret) => world.bullets.includes(turret));
  for (const turret of gun.turretRefs) {
    if ((turret.build ?? 1) !== 4) continue;
    owner.shield = 1;
    owner.shieldManaged = true;
    if (!owner.shieldHitClip) attachTurretShield(owner, gun);
  }
  if (wasShielded && owner.shield === 0) removeTurretShield(owner, gun);
  let target = world.bullets.find((turret) => turret.uid === gun.turretId);
  if (!target || (target.build ?? 1) === 4) {
    gun.turretId = undefined;
    target = undefined;
  }
  const position = world.muzzle(owner, gun, 0);
  gun.angle = angleTo(position, target ?? { x: 0, y: 0 }) - owner.rotation;
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

export function tickTurret(world: World, turret: Projectile, owner: Tank | undefined) {
  if (!owner) {
    turret.dead = true;
    projectileImpact(world, turret);
    return;
  }
  turret.artFrame = turret.build ?? 1;
  for (const shot of world.bullets) {
    if (shot.dead || shot.enemy === turret.enemy || !touches(world, turret, shot)) continue;
    turret.health = (turret.health ?? 10) - shot.damage;
    world.emit('hit');
    projectileCallback(world, shot, turret);
    // _-BL.blnBeam starts true for every shipped class; this contact leaves the shot alive.
    if (turret.health <= 0) {
      turret.dead = true;
      projectileImpact(world, turret);
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
  turret.x += turret.motion?.x ?? 0;
  turret.y += turret.motion?.y ?? 0;
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
  return true;
}
