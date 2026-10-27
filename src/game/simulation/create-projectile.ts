import type { Projectile } from '../core/types';

type Spawn = Pick<
  Projectile,
  'owner' | 'enemy' | 'kind' | 'symbol' | 'x' | 'y' | 'angle' | 'speed' | 'damage'
> &
  Partial<Projectile>;

/** A new _-BL instance must not inherit its parent's transient state or callbacks. */
export function createProjectile(uid: number, options: Spawn): Projectile {
  return {
    heading: options.angle,
    radius: 2,
    age: 0,
    life: Infinity,
    explode: 0,
    targetId: null,
    hit: new Set(),
    missExempt: options.kind === 'apocalypse' ? true : undefined,
    dead: false,
    artScale: 1,
    orbit: 0,
    ...options,
    uid,
  };
}
