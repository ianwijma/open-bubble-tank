import { projectileOutside } from './projectile-boundary';
import { actorAngle, actorDirection, actorHeading } from './actor-movement';
import { displayPixel } from '../core/display-values';
import type { Projectile, Tank } from '../core/types';
import { tankHitDetail } from './hit-location';
import { projectileTankContact } from './projectile-contact';
import type { World } from './world';
import { HomingTargetReadError } from './homing-projectiles';
import { collisionSound } from './collision-sound';

/** _-XV's NaN distance scan leaves its initialized target index at zero. */
function steer(world: World, b: Projectile) {
  let target = b.homing!.target;
  if (!target || !world.actorParents.inField(target, world.field)) {
    target = world.field.enemies[0];
    if (target) b.homing!.target = target;
  }
  if (!target) {
    b.removeAfterFrame = true;
    world.addCombatEffect(b, 'seekerExplosion');
    collisionSound(world, b, true);
    b.motion = actorDirection(b.angle, b.speed);
    return;
  }
  b.targetId = target.uid;
  const origin = world.bulletGlobal(b) ?? world.actorParents.fieldGlobal(b, world.field);
  if (!origin) throw new HomingTargetReadError('Friendly seeker read its projectile parent');
  const point = world.actorParents.localToGlobal(target, tankHitDetail(target));
  const angle = actorHeading(origin, point);
  b.angle = actorAngle(angle);
  b.motion = actorDirection(angle, b.speed);
}

/** Base Setup invokes homing before the new projectile is appended. */
export function initializeAvatarSeeker(world: World, b: Projectile, target?: Tank) {
  if (b.kind !== 'seeker' || b.enemy || b.homing) return;
  b.angle = actorAngle(b.angle);
  b.homing = {
    target: target ?? world.field.enemies.find((tank) => tank.uid === b.targetId),
    avatar: world.player,
    close: false,
  };
  steer(world, b);
}

export function tickAvatarSeeker(world: World, b: Projectile) {
  // A failed Setup disabled _-PJ before Run. Failure inside this Run still
  // completes its already selected contact/movement tail once.
  if (b.removeAfterFrame) return;
  if (projectileOutside(world, b)) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  if (b.homing) steer(world, b);
  else initializeAvatarSeeker(world, b);
  if (projectileTankContact(world, b)) {
    b.dead = true;
    return;
  }
  const movement = b.motion!;
  b.x = displayPixel(b.x + movement.x);
  b.y = displayPixel(b.y + movement.y);
}
