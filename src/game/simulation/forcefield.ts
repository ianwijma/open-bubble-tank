import type { Tank } from '../core/types';

/** AvatarInterface._-1J -> APassiveForcefield.FinalPartCall on ordinary exits. */
export function detachForcefield(tank: Tank) {
  if (!tank.design.parts.some((part) => part.type === 5005)) return;
  tank.forcefieldAttached = false;
  tank.forcefieldReady = false;
}

/** Run recreates the wrapper through Setup; damage/replenish counters survive. */
export function refreshForcefield(tank: Tank) {
  if (tank.forcefieldAttached) return;
  tank.forcefieldAttached = true;
  tank.forcefieldGeneration++;
  tank.forcefieldStartedAt = tank.artAge;
  tank.forcefieldFrame = 1;
  tank.forcefieldAngle = 0;
  tank.forcefieldReady = true;
}
