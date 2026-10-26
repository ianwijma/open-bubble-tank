import flags from '../data/projectile-flags.json';
import type { Projectile } from '../core/types';
const defaults = { destroyable: false, seeker: false, beam: true, rotatesTowardTarget: false };
export function projectileFlags(bullet: Projectile) {
  const value = (flags as Record<number, typeof defaults>)[bullet.symbol] ?? defaults;
  return bullet.kind === 'seekerMine'
    ? { ...value, seeker: bullet.mineState?.armed ?? !!bullet.detonating }
    : value;
}
