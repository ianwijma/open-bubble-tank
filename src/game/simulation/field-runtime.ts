import type { Effect, Field, GunState, Pickup, Projectile, Tank } from '../core/types';

/** Live Bubblefield collections. Revisits restore enemies, never this detached runtime. */
export class FieldRuntime {
  constructor(readonly field: Field) {}
  /** Death callbacks queue removal; normal Run flushes before the next actor pass. */
  enemyRemovals: Tank[] = [];
  allyRemovals: Tank[] = [];
  bullets: Projectile[] = [];
  pickups: Pickup[] = [];
  effects: Effect[] = [];
  effectQueue: Effect[] = [];
  allies: Tank[] = [];
  pending: { kind?: 'shield'; owner: Tank; gun: GunState; frame: number; total: number }[] = [];
  collectTimer = -1;
  shootTimer = -1;
  apocalypse = false;
}
