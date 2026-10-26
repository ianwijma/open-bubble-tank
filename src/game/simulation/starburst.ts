import { BULLET_RADIUS } from '../core/constants';
import { direction, length } from '../core/math';
import type { Projectile } from '../core/types';
import type { World } from './world';
import { projectileTankContact } from './projectile-contact';
import { createProjectile } from './create-projectile';

const fuses = new WeakMap<Projectile, number>();

/** _-Hu tests wall/contact before its 45 movement frames and following-Run split. */
export function tickStarburst(world: World, b: Projectile) {
  if (length(b) > BULLET_RADIUS * world.field.scale) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  if (projectileTankContact(world, b)) {
    b.dead = true;
    return;
  }
  const fuse = fuses.get(b) ?? 45;
  if (fuse <= 0) {
    starSplit(world, b);
    b.dead = true;
    return;
  }
  fuses.set(b, fuse - 1);
  const movement = direction(b.angle, b.speed);
  b.x += movement.x;
  b.y += movement.y;
}

export function starSplit(world: World, b: Projectile) {
  for (let angle = 0; angle < 360; angle += 10)
    world.addBullet(
      createProjectile(world.nextId(), {
        owner: b.owner,
        enemy: false,
        kind: 'shell',
        symbol: 1721,
        x: b.x,
        y: b.y,
        angle: b.angle + angle,
        speed: 7,
        damage: 5,
      }),
    );
}
