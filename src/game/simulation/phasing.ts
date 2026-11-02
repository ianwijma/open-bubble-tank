import type { GunState, Tank } from '../core/types';
import { displayAlpha } from '../core/display-values';
import type { Random } from '../core/math';

/** The Phasing clip constructor owns an integer counter before behavior registration. */
export const createPhasing = (rng: Random) => ({ counter: rng.int(0, 50) | 0 });

/** _-ct._-Ai.BehaviorRun, called by the active registered behavior after movement. */
export function tickPhasing(tank: Tank, gun: GunState) {
  const state = gun.phasing;
  if (!state) return;
  const counter = ++state.counter;
  if (counter <= 50 && tank.alpha > 0) tank.alpha = displayAlpha(tank.alpha - 0.02);
  else if (counter > 150 && counter <= 200 && tank.alpha < 1)
    tank.alpha = displayAlpha(tank.alpha + 0.02);
  else if (counter === 300) state.counter = 0;
}
