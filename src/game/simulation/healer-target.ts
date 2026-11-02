import type { BehaviorTargetState, Tank } from '../core/types';
import type { Random } from '../core/math';
import type { BehaviorPopulation } from './behavior-targets';

/** Source null MovieClip read aborts the current Main.Run listener, not the stage clock. */
export class HealerTargetReadError extends Error {
  constructor() {
    super('Healer AcquireTarget read a missing ally');
  }
}
/** EBehaviorHealer.AcquireTarget; a held reference returns before master/population checks. */
export function acquireHealerTarget(
  state: BehaviorTargetState,
  owner: Tank,
  population: BehaviorPopulation,
  rng: Random,
) {
  if (state.target) return state.target;
  state.master = owner.side;
  if (state.master === 'enemy') {
    for (const candidate of population.enemies)
      if (candidate !== owner && candidate.life < candidate.maxLife) {
        state.target = candidate;
        break;
      }
  } else if (state.master === 'ally') {
    let candidate = population.avatar;
    if (candidate.life === candidate.maxLife)
      for (let index = 0; index < population.allies.length; index++) {
        candidate = population.allies[rng.int(1, population.allies.length)];
        if (candidate === owner) continue;
        if (!candidate) throw new HealerTargetReadError();
        if (candidate.life < candidate.maxLife) break;
      }
    state.target = candidate;
  }
  return state.target;
}
