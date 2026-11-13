import type { Effect, Field, Pickup, Projectile, Tank } from '../core/types';
import type { RegisteredEffects } from './registered-effects';

/** Live Bubblefield collections. Revisits restore enemies, never this detached runtime. */
export class FieldRuntime {
  constructor(
    readonly field: Field,
    private effectsOwner: RegisteredEffects,
  ) {}
  /** Death callbacks queue removal; normal Run flushes before the next actor pass. */
  enemyRemovals: Tank[] = [];
  allyRemovals: Tank[] = [];
  bullets: Projectile[] = [];
  pickups: Pickup[] = [];
  get effects() {
    return this.effectsOwner.effectsFor(this.field);
  }
  effectQueue: Effect[] = [];
  allies: Tank[] = [];
  get pending() {
    return this.effectsOwner.pendingFor(this.field);
  }
  collectTimer = -1;
  shootTimer = -1;
  apocalypse = false;
}
