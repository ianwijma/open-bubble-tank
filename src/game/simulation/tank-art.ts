import type { Tank } from '../core/types';
import { legacyShieldFilm } from '../core/shield-art';

/** Attached MovieClips advance on the stage clock, independently of actor Run. */
export function advanceTankArt(tank: Tank) {
  tank.artAge++;
  if (tank.statusDecoration) tank.statusDecoration.artAge++;
  if (legacyShieldFilm(tank) || tank.shieldClips.some((clip) => clip.kind === 'film'))
    tank.shieldAge++;
  tank.shieldHitAge = Math.min(16, tank.shieldHitAge + 1);
  for (const clip of tank.shieldClips)
    clip.age =
      clip.kind === 'hit'
        ? Math.min(16, clip.age + 1)
        : clip.style === 'turret'
          ? Math.min(25, clip.age + 1)
          : clip.age + 1;
  if (tank.forcefieldFrame > 1) {
    tank.forcefieldFrame++;
    if (tank.forcefieldFrame === 25 || tank.forcefieldFrame > 64) tank.forcefieldFrame = 1;
    else if (tank.forcefieldFrame === 35) tank.forcefieldFrame = 26;
  }
}
