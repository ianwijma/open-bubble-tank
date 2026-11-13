import { projectileOutside } from './projectile-boundary';
import { angleTo, direction } from '../core/math';
import { displayPixel } from '../core/display-values';
import type { Projectile } from '../core/types';
import { tankHitLocation } from './hit-location';
import { projectileTankContact } from './projectile-contact';
import type { World } from './world';

/** _-XV's NaN distance scan leaves its initialized target index at zero. */
function steer(world: World, b: Projectile) {
  let target = world.field.enemies.find((tank) => tank.uid === b.targetId);
  if (!target) target = world.field.enemies[0];
  if (!target) {
    b.removeAfterFrame = true;
    world.addCombatEffect(b, 'seekerExplosion');
    return;
  }
  b.targetId = target.uid;
  b.angle = angleTo(b, tankHitLocation(target));
}

/** Base Setup invokes homing before the new projectile is appended. */
export function initializeAvatarSeeker(world: World, b: Projectile) {
  if (b.kind === 'seeker' && !b.enemy) steer(world, b);
}

export function tickAvatarSeeker(world: World, b: Projectile) {
  if (projectileOutside(world, b)) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  steer(world, b);
  if (projectileTankContact(world, b)) {
    b.dead = true;
    return;
  }
  const movement = direction(b.angle, b.speed);
  b.x = displayPixel(b.x + movement.x);
  b.y = displayPixel(b.y + movement.y);
}
