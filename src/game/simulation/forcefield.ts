import type { Tank } from '../core/types';
import { addTankChild, removeTankChild } from './tank-display';

/** AvatarInterface._-1J -> APassiveForcefield.FinalPartCall on ordinary exits. */
export function detachForcefield(tank: Tank) {
  if (!tank.design.parts.some((part) => part.type === 5005)) return;
  tank.forcefieldAttached = false;
  tank.forcefieldReady = false;
  removeTankChild(tank, 'forcefield');
}

/** Run recreates the wrapper through Setup; damage/replenish counters survive. */
export function refreshForcefield(tank: Tank) {
  if (tank.forcefieldAttached) {
    // Run49–56 re-adds the existing wrapper, without Setup or a recharge animation.
    if (tank.displayChildren.at(-1) !== 'forcefield') {
      addTankChild(tank, 'forcefield');
      tank.forcefieldReady = true;
    }
    return;
  }
  tank.forcefieldAttached = true;
  tank.forcefieldGeneration++;
  tank.forcefieldStartedAt = tank.artAge;
  tank.forcefieldFrame = 1;
  tank.forcefieldAngle = 0;
  tank.forcefieldReady = true;
  addTankChild(tank, 'forcefield');
}
