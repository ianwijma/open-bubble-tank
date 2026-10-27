import { direction, distance } from '../core/math';
import type { Projectile } from '../core/types';
import { projectileOutside } from './projectile-boundary';
import type { World } from './world';

/** _-c4 writes only state2 and its current movement vector on the first enemy clip. */
export function deflectFirstEnemy(world: World, buster: Projectile) {
  const other = world.bullets.find(
    (bullet) => bullet.enemy && distance(bullet, buster) < 11.5 + world.projectileWidth(bullet) / 2,
  );
  if (other) other.deflected = direction(buster.angle, buster.speed);
}

/** _-BL.Run moves unconditionally, then checks _-PJ and the virtual boundary. */
export function tickDeflected(world: World, bullet: Projectile) {
  bullet.x += bullet.deflected!.x;
  bullet.y += bullet.deflected!.y;
  // Turret is the sole live shipped subtype which switches _-PJ off.
  if (!(bullet.kind === 'turret' && bullet.stopped) && projectileOutside(world, bullet)) {
    world.addCombatEffect(bullet, 'impact');
    bullet.dead = true;
  }
}
