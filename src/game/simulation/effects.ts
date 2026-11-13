import art from '../data/effect-art.json';
import screenArt from '../data/screen-effect-art.json';
import type { Effect, Projectile, Vec } from '../core/types';
import { drawEffectLine, type EffectPlayback } from './effect-playback';
import type { World } from './world';

const allArt = { ...art, ...screenArt };
export type CombatEffect = keyof typeof allArt;
export interface EffectOptions {
  layer?: Effect['layer'];
  randomRotation?: boolean;
  scale?: number;
  /** Endpoint in the new effect's local coordinates, drawn into line_mc. */
  line?: Vec;
  rotation?: number;
  blendMode?: Effect['blendMode'];
}
const top = new Set<CombatEffect>(['impact', 'seekerExplosion', 'leech']);
export function combatEffect(
  uid: number,
  kind: CombatEffect,
  options: EffectOptions,
  playback: EffectPlayback,
): Effect {
  const clip = allArt[kind];
  const effect: Effect = {
    uid,
    x: 0,
    y: 0,
    kind: 'native',
    symbol: clip.symbol,
    age: 0,
    duration: clip.frames,
    radius: kind === 'impact' ? 10 : 60,
    color: 0xffffff,
    layer: kind in screenArt ? 'screen' : top.has(kind) ? 'top' : 'bottom',
    randomRotation: kind in screenArt || top.has(kind),
    rotation: 0,
    scale: 1,
    ...options,
  };
  playback.construct(effect);
  if (options.line) drawEffectLine(effect, options.line);
  return effect;
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
  const effect = world.addCombatEffect(bullet, 'rocketTrail', {}, true);
  if (previous) {
    effect.line = { x: previous.x - bullet.x, y: previous.y - bullet.y };
    drawEffectLine(effect, effect.line);
  }
  bullet.trailPoint = { x: bullet.x, y: bullet.y };
}
