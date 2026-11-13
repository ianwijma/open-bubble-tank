import type { Effect, Field, Pickup, Projectile, Tank } from '../core/types';
import { isArtwork, type EffectRequest, type RegisteredEffects } from './registered-effects';

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
  private effectRequests: EffectRequest[] = [];
  /** Compatibility artwork read; requests, rather than this snapshot, own the queue. */
  get effectQueue(): readonly Effect[] {
    return this.effectRequests.map(({ clip }) => clip).filter(isArtwork);
  }
  queueEffect(request: EffectRequest) {
    this.effectRequests.push(request);
  }
  flushEffects(register: (request: EffectRequest) => void) {
    // Source traverses the live queue and only replaces it after a successful tail.
    for (const request of this.effectRequests) register(request);
    this.clearEffectQueue();
  }
  clearEffectQueue() {
    this.effectRequests = [];
  }
  allies: Tank[] = [];
  get queuedCarriers() {
    return this.effectRequests.map(({ clip }) => clip).filter((clip) => !isArtwork(clip));
  }
  /** Logical scheduled carriers. Neither this nor queuedCarriers is a parent query. */
  get pending() {
    return [...this.queuedCarriers, ...this.effectsOwner.pendingFor(this.field)];
  }
  collectTimer = -1;
  shootTimer = -1;
  apocalypse = false;
}
