import { BULLET_RADIUS } from '../core/constants';
import { direction, distance, length } from '../core/math';
import type { Projectile } from '../core/types';
import type { World } from './world';

/** _-OE fades only during MoveBullet; its enemy-layer pixel gate precedes the range scan. */
export function tickRepulsor(world: World, b: Projectile) {
  b.artAlpha = (b.artAlpha ?? 1) - 0.04;
  if (b.artAlpha <= 0 || length(b) > BULLET_RADIUS * world.field.scale) {
    b.dead = true;
    return;
  }
  if (
    world.field.enemies.length &&
    [...world.field.enemies, ...world.allies].some(
      (tank) => !tank.dead && world.hitTest(tank, b.x, b.y),
    )
  ) {
    for (const tank of world.field.enemies) {
      if (tank.dead || Math.trunc(distance(b, tank) - tank.radius) >= 70) continue;
      // The first earlier contact blocks the rest of the array, rather than being skipped.
      if (b.hit.has(tank.uid)) break;
      const force = direction(b.angle, (15 - 2 * tank.design.classId) * b.artAlpha * 2);
      tank.velocity.x += force.x;
      tank.velocity.y += force.y;
      world.damageDoneIncr(b.damage);
      world.damage(tank, b.damage, b);
      b.hit.add(tank.uid);
      world.flushEnemyRemovals();
      break;
    }
  }
  const movement = direction(b.angle, b.speed);
  b.x += movement.x;
  b.y += movement.y;
}
