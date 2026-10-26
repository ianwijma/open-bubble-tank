import { direction } from '../core/math';
import type { Projectile, Tank } from '../core/types';
import type { World } from './world';
import { projectileImpact } from './effects';
import { applyProjectileStatus } from './status';
import { spawnPickups } from './pickups';

/** Source callbacks precede direct damage; splash excludes only this contact. */
export function projectileCallback(world: World, bullet: Projectile, target?: Tank | Projectile) {
  projectileImpact(world, bullet);
  if (bullet.kind === 'leech') spawnPickups(world, bullet, 1, world.pickups, true);
  if (bullet.explode && bullet.kind !== 'apocalypse')
    world.explode(bullet, bullet.explode, bullet.splashDamage ?? bullet.damage, target);
}
export function projectileTankCallback(world: World, bullet: Projectile, tank: Tank) {
  projectileCallback(world, bullet, tank);
  if (bullet.status) applyProjectileStatus(world, tank, bullet.status);
  world.damage(tank, bullet.damage, bullet);
  bullet.hit.add(tank.uid);
}

/** _-BL/_-Un and _-dp sample before movement. The layer gate uses no half-step. */
export function projectileTankContact(world: World, bullet: Projectile) {
  const special = bullet.kind === 'orbital' || (bullet.kind === 'seeker' && bullet.enemy);
  if (!special && world.field.enemies.length === 0) return false;
  const massive = bullet.symbol === 1794;
  const half = direction(bullet.angle, bullet.speed / 2);
  const samples = [{ x: bullet.x, y: bullet.y }];
  if (massive) {
    const radius = world.projectileWidth(bullet) / 2;
    samples.push(
      { x: bullet.x + radius, y: bullet.y },
      { x: bullet.x - radius, y: bullet.y },
      { x: bullet.x, y: bullet.y + radius },
      { x: bullet.x, y: bullet.y - radius },
    );
  }
  const hit = (tank: Tank) => samples.some((p) => world.hitTest(tank, p.x, p.y));
  if (
    !bullet.enemy &&
    !special &&
    ![...world.field.enemies, ...world.allies].some((t) => !t.dead && hit(t))
  )
    return false;
  const targets = bullet.enemy
    ? bullet.kind === 'seeker'
      ? [world.player]
      : [world.player, ...world.allies]
    : world.field.enemies;
  for (const tank of targets) {
    if (massive && bullet.hit.has(tank.uid)) continue;
    if (tank.dead || (!hit(tank) && !world.hitTest(tank, bullet.x - half.x, bullet.y - half.y)))
      continue;
    const carrier =
      !bullet.enemy &&
      tank.guns.find(
        (g) => g.part.type === 4013 && world.hitPart(tank, g.part, bullet.x, bullet.y),
      );
    if (carrier) {
      world.releaseCarrier(tank, carrier);
      if (massive) bullet.hit.add(tank.uid);
      return false;
    }
    if (bullet.hit.has(tank.uid)) {
      return false;
    }
    projectileTankCallback(world, bullet, tank);
    if (bullet.kind === 'pierce') world.field.enemies = world.field.enemies.filter((t) => !t.dead);
    return true;
  }
  return false;
}
