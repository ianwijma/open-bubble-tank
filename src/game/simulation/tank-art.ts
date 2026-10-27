import type { Tank } from '../core/types';

/** Attached MovieClips advance on the stage clock, independently of actor Run. */
export function advanceTankArt(tank: Tank) {
  tank.artAge++;
  if (tank.statusDecoration) tank.statusDecoration.artAge++;
  if (tank.shield > 0) tank.shieldAge++;
  tank.shieldHitAge = Math.min(16, tank.shieldHitAge + 1);
  if (tank.forcefieldFrame > 1) {
    tank.forcefieldFrame++;
    if (tank.forcefieldFrame === 25 || tank.forcefieldFrame > 64) tank.forcefieldFrame = 1;
    else if (tank.forcefieldFrame === 35) tank.forcefieldFrame = 26;
  }
}
