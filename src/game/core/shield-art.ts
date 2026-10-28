import type { Tank } from './types';

/** Turret protection and explicitly initialized snapshots use the shared clip fields. */
export function legacyShieldFilm(tank: Tank) {
  return (
    (tank.shieldClips.length === 0 && tank.shield > 0) ||
    tank.displayChildren.includes('shield-film')
  );
}
