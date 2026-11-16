import type { Projectile } from '../core/types';
import type { World } from './world';

/** It reads x/y from the enemy array itself (NaN), so its shipped retarget loop cannot select an enemy. */
export function expireInfectionTarget(world: World, bullet: Projectile) {
  const attempts = world.field.enemies.length * 2;
  while ((bullet.infectionTries ?? 0) < attempts) {
    world.rng.int(0, world.field.enemies.length - 1);
    bullet.infectionTries = (bullet.infectionTries ?? 0) + 1;
  }
  bullet.removeAfterFrame = true;
  world.addCombatEffect(bullet, 'seekerExplosion', { randomRotation: false });
}
