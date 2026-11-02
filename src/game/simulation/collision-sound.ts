import type { Projectile } from '../core/types';
import type { World } from './world';

// Recovered BulletCallCollisionDetected overrides that never call SoundCall.
// The symbol identifies the virtual callback; damage and explosion size do not.
const silent = new Set([
  13, 15, 1792, 1793, 1794, 1796, 1807, 1809, 1813, 1831, 2016, 2033, 2036, 2178, 2182, 2221, 2228,
  2250, 2252, 2296,
]);

/** The callback's enemy argument can differ from the shot's ownership (notably turrets). */
export function collisionSound(world: World, bullet: Projectile, enemy = bullet.enemy) {
  if (silent.has(bullet.symbol)) return;
  const seeker = [2248, 2249, 2404].includes(bullet.symbol);
  if (seeker && bullet.explode) return;
  const always = seeker || [1728, 1802, 1827].includes(bullet.symbol),
    resetEvenWhenSilent = [2058, 2286, 2440].includes(bullet.symbol);
  if (enemy && !always && !resetEvenWhenSilent) return;
  if (world.hitSoundTimer !== -1) return;
  if (!enemy || always) world.emit('hit');
  world.hitSoundTimer = 4;
}
