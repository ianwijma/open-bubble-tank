import { BULLET_RADIUS } from '../core/constants';
import { direction, length } from '../core/math';
import type { Projectile } from '../core/types';
import { projectileTankContact } from './projectile-contact';
import type { World } from './world';

/** _-dO removes an already transparent shot before wall checks or this Run's fade. */
export function tickGrow(world: World, bullet: Projectile) {
  if ((bullet.artAlpha ?? 1) <= 0) {
    bullet.dead = true;
    // RemoveBullet splices now: the live bullet iterator skips the shifted next entry.
    world.removeBullet(bullet);
    return;
  }
  if (length(bullet) > BULLET_RADIUS * world.field.scale) {
    world.addCombatEffect(bullet, 'impact');
    bullet.dead = true;
    return;
  }
  const scale = bullet.artScale ?? 1;
  bullet.artScale = scale + 0.05;
  bullet.radius *= bullet.artScale / scale;
  bullet.artAlpha = Math.max(0, Math.min(1, (bullet.artAlpha ?? 1) - 0.05));
  // Rotation remains the authored heading; only SetMovement receives the jitter.
  bullet.angle = bullet.heading + world.rng.int(-5, 5);
  projectileTankContact(world, bullet);
  const movement = direction(bullet.angle, bullet.speed);
  bullet.x += movement.x;
  bullet.y += movement.y;
}
