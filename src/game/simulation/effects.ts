import art from '../data/effect-art.json';
import type { Effect, Projectile, Vec } from '../core/types';
import type { World } from './world';

export type CombatEffect = keyof typeof art;
export interface EffectOptions {
  layer?: 'top' | 'bottom';
  randomRotation?: boolean;
  scale?: number;
  /** Endpoint in the new effect's local coordinates, drawn into line_mc. */
  line?: Vec;
}
const top = new Set<CombatEffect>(['impact', 'seekerExplosion', 'leech']);
export function combatEffect(
  uid: number,
  pos: Vec,
  kind: CombatEffect,
  options: EffectOptions,
): Effect {
  const clip = art[kind];
  return {
    uid,
    x: pos.x,
    y: pos.y,
    kind: 'native',
    symbol: clip.symbol,
    age: 0,
    duration: clip.frames,
    radius: kind === 'impact' ? 10 : 60,
    color: 0xffffff,
    layer: top.has(kind) ? 'top' : 'bottom',
    randomRotation: top.has(kind),
    rotation: 0,
    scale: 1,
    ...options,
  };
}

/** BulletCallCollisionDetected chooses artwork independently of area damage. */
export function projectileImpact(world: World, bullet: Projectile) {
  if (['beam', 'healBeam', 'whip', 'flak', 'push', 'infect'].includes(bullet.kind)) return;
  if (['seeker', 'orbital'].includes(bullet.kind)) {
    world.addCombatEffect(bullet, 'seekerExplosion');
  } else if (['mine', 'seekerMine'].includes(bullet.kind)) {
    world.addCombatEffect(bullet, 'mineExplosion');
  } else if (bullet.kind === 'leech') {
    world.addCombatEffect(bullet, 'leech');
  } else {
    world.addCombatEffect(bullet, 'impact');
    if (bullet.partType === 2010 || bullet.symbol === 1794)
      world.addCombatEffect(bullet, 'explosion');
    if (bullet.symbol === 1796) world.addCombatEffect(bullet, 'damageBurst');
  }
}

export function rocketTrail(world: World, bullet: Projectile) {
  if ((bullet.trailCounter = (bullet.trailCounter ?? 0) + 1) < 3) return;
  bullet.trailCounter = 0;
  const previous = bullet.trailPoint;
  world.addCombatEffect(
    bullet,
    'rocketTrail',
    {
      line: previous ? { x: previous.x - bullet.x, y: previous.y - bullet.y } : undefined,
    },
    true,
  );
  bullet.trailPoint = { x: bullet.x, y: bullet.y };
}
