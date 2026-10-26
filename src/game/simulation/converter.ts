import type { Tank } from '../core/types';
import { createProjectile } from './create-projectile';
import { projectileFlags } from './projectile-flags';
import type { World } from './world';
import projectileArt from '../data/projectile-art.json';

/** _-0D.DroneConversionTest scans the live array, then flushes its removal queue. */
export function convertDrones(world: World, owner: Tank) {
  const removed = [];
  for (const old of world.bullets) {
    if (!old.enemy || !projectileFlags(old).rotatesTowardTarget) continue;
    removed.push(old);
    const index = Math.floor(world.rng.next() * (world.field.enemies.length - 1));
    world.addBullet(
      createProjectile(world.nextId(), {
        owner: owner.uid,
        enemy: false,
        kind: 'seeker',
        symbol: projectileArt['3009'].symbol,
        x: old.x,
        y: old.y,
        angle: old.angle,
        speed: 10,
        damage: 15,
        targetId: world.field.enemies[index]?.uid ?? null,
      }),
    );
  }
  // Includes failed replacement Setup and any earlier pending Setup removal.
  for (const bullet of world.bullets) if (bullet.removeAfterFrame) removed.push(bullet);
  for (const bullet of removed) {
    bullet.dead = true;
    world.removeBullet(bullet);
  }
}
