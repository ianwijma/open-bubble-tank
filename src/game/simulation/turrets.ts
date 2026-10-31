import { projectileOutside } from './projectile-boundary';
import { direction, distance } from '../core/math';
import type { Projectile, Tank } from '../core/types';
import type { World } from './world';
import { projectileImpact } from './effects';
import { projectileCallback } from './projectile-contact';
import { addTankChild } from './tank-display';

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
  if (turret.artFrame === 4) {
    if (!owner.displayChildren.includes('shield-hit')) {
      owner.shieldHitDiameter = owner.radius * 2;
      addTankChild(owner, 'shield-hit');
    }
    if (!owner.displayChildren.includes('shield-film')) addTankChild(owner, 'shield-film');
    if (owner.shield === 0) owner.shieldAge = 0;
    owner.shield = 2;
  }
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
