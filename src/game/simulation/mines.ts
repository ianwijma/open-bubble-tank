import { BULLET_RADIUS } from '../core/constants';
import { angleTo, direction, distance, length } from '../core/math';
import type { Projectile, Rect } from '../core/types';
import type { World } from './world';
import { projectileCallback, projectileTankContact } from './projectile-contact';
import { projectileImpact } from './effects';
export function overlaps(a: Rect, b: Rect) {
  return (
    !a.empty &&
    !b.empty &&
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

/** _-XK: contact, scatter, then arming OR homing; the arming frame does not home. */
export function tickSeekerMine(world: World, b: Projectile) {
  world.mineTimelines.initialize(b);
  const state = b.mineState!;
  if (b.wipe) {
    projectileImpact(world, b);
    b.dead = true;
    return;
  }
  if (length(b) > BULLET_RADIUS * world.field.scale) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  if (world.field.enemies.length) {
    const avatar = world.player,
      half = state.movement;
    if (
      world.hitTest(avatar, b.x, b.y) ||
      world.hitTest(avatar, b.x - half.x / 2, b.y - half.y / 2)
    ) {
      projectileImpact(world, b);
      world.damage(avatar, b.damage, b);
      b.dead = true;
      return;
    }
    if (state.armed) {
      const bounds = world.projectileBounds(b);
      const shot = world.bullets.find(
        (shot) => !shot.enemy && !shot.dead && overlaps(world.projectileBounds(shot), bounds),
      );
      if (shot) {
        projectileImpact(world, b);
        projectileCallback(world, shot, b);
        b.dead = true;
        return;
      }
    }
  }
  if ((b.scatter ?? 0) > 0) {
    b.scatter!--;
    state.movement = direction(b.angle, b.speed);
    b.x += state.movement.x * 2;
    b.y += state.movement.y * 2;
  }
  if (!state.armed) {
    if (distance(b, world.player) <= 75 + world.player.radius) {
      b.targetId = world.player.uid;
      world.mineTimelines.arm(b);
    }
  } else {
    b.angle = angleTo(b, world.player);
    state.movement = direction(b.angle, b.speed);
    b.x += state.movement.x;
    b.y += state.movement.y;
  }
}

/** _-U9/_-M1 are stationary; speed only supplies their inherited half-step vector. */
export function tickStaticMine(world: World, b: Projectile) {
  world.mineTimelines.initialize(b);
  if (b.wipe) {
    projectileImpact(world, b);
    b.dead = true;
    return;
  }
  if (projectileTankContact(world, b)) b.dead = true;
}
