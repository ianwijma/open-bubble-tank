import { BULLET_RADIUS } from '../core/constants';
import type { Projectile } from '../core/types';
import type { World } from './world';

// BF_BG_mc1537 includes a 3px stroke: Script width850.5, unlike its fill847.5.
const APOCALYPSE_RADIUS = 425.25;

/** _-BL.IsOutsideOfBubble reports each call; _-MB is not a reporting latch. */
export function reportProjectileMiss(world: World, bullet: Projectile) {
  if (!bullet.missExempt) {
    if (bullet.enemy) world.stats.enemyMissed++;
    else world.stats.friendlyMissed++;
  }
}

/** Virtual boundary dispatch is also used by base Run's deflected state2. */
export function projectileOutside(world: World, bullet: Projectile) {
  if (bullet.kind === 'beam' || bullet.kind === 'healBeam') return false;
  const radius =
    (bullet.kind === 'apocalypse' ? APOCALYPSE_RADIUS : BULLET_RADIUS) * world.field.scale;
  if (!(bullet.x * bullet.x + bullet.y * bullet.y > radius * radius)) return false;
  // _-bk's override is geometry only; its normal seventh exit reports separately.
  if (bullet.kind !== 'ricochet') reportProjectileMiss(world, bullet);
  return true;
}
