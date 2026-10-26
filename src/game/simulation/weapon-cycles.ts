import type { GunState } from '../core/types';

/** Symbol701 (_-KE) flips after 100 calls plus a separate switch frame. */
export function advanceRotatingCycle(gun: GunState) {
  const cycle = (gun.rotatingCycle ??= { remaining: 100, active: false });
  if (cycle.remaining > 0) cycle.remaining--;
  else {
    cycle.active = !cycle.active;
    cycle.remaining = 100;
  }
  if (cycle.active) gun.angle += 5;
  return cycle.active;
}

/** Symbol25 (_-IB) trigger clock: 120-call delay, then one shot every five calls. */
export function triggerSuppressionCycle(gun: GunState) {
  const cycle = (gun.suppressionCycle ??= { delay: 120, spacing: 4 });
  if (--cycle.delay > 0) return false;
  if (cycle.spacing > 0) {
    cycle.spacing--;
    return false;
  }
  cycle.spacing = 4;
  if (cycle.delay < -50) cycle.delay = 120;
  return true;
}
