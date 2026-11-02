import type { BehaviorTargetState, Tank } from '../core/types';
import type { Random } from '../core/math';

export interface BehaviorPopulation {
  avatar: Tank;
  enemies: readonly Tank[];
  allies: readonly Tank[];
}
/** Weapon owns a MovieClip reference and a separate initial zero ally count. */
export const createBehaviorTarget = (): BehaviorTargetState => ({
  master: null,
  target: null,
  allies: 0,
});
/** Weapon.AcquireTarget: candidates always belong to currentBFTarget, including during travel. */
export function acquireBehaviorTarget(
  state: BehaviorTargetState,
  side: Tank['side'],
  population: BehaviorPopulation,
  rng: Random,
) {
  state.master = side;
  if (side === 'enemy') {
    state.target = population.avatar;
    // The coin is drawn even when there are no allies. The source index can equal length.
    if (rng.int(1, 2) === 1 && population.allies.length)
      state.target = population.allies[rng.int(0, population.allies.length)] ?? null;
  } else if (side === 'ally') {
    state.target = null;
    if (population.enemies.length)
      state.target = population.enemies[rng.int(0, population.enemies.length - 1)] ?? null;
  }
}
/** Active non-Healer behavior prefix: Run acquisition, then Aim acquisition, then enemy ally-count change. */
export function refreshBehaviorTarget(
  state: BehaviorTargetState,
  side: Tank['side'],
  population: BehaviorPopulation,
  rng: Random,
  hasParent: (target: Tank) => boolean,
  aim?: (target: Tank) => void,
) {
  if (!state.target || !hasParent(state.target))
    acquireBehaviorTarget(state, side, population, rng);
  // EnemyAim repeats the check before blnRotate=false can return.
  if (state.master === 'enemy' || state.master === 'ally') {
    if (!state.target || !hasParent(state.target))
      acquireBehaviorTarget(state, side, population, rng);
    else aim?.(state.target);
  }
  if (state.master === 'enemy' && state.allies !== population.allies.length) {
    acquireBehaviorTarget(state, side, population, rng);
    state.allies = population.allies.length;
  }
  return state.target;
}
