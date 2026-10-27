import { projectileOutside } from './projectile-boundary';
import { direction } from '../core/math';
import type { Projectile } from '../core/types';
import type { World } from './world';

/** _-cW polls the independent authored clip; paused frame15 can be missed entirely. */
export function tickFlak(world: World, bullet: Projectile) {
  if (projectileOutside(world, bullet)) {
    world.addCombatEffect(bullet, 'impact');
    bullet.dead = true;
    return;
  }
  const total = world.projectileTimelines.totalFrames(bullet);
  if (bullet.artFrame === total - 8) world.explode(bullet, 60, 2);
  if (bullet.artFrame === total) {
    bullet.dead = true;
    return;
  }
  const movement = direction(bullet.angle, bullet.speed);
  bullet.x += movement.x;
  bullet.y += movement.y;
}
