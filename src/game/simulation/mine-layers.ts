import type { GunState, MineReference, Projectile } from '../core/types';
import type { World } from './world';
function wrapped(ref: MineReference): ref is { mc: Projectile | null; x: number; y: number } {
  return !!ref && 'mc' in ref;
}
/** Raw seeker-mine refs intentionally remain after ordinary removal. */
export function recordLayerMine(
  world: World,
  gun: GunState,
  shot: Projectile | null,
  pos: { x: number; y: number },
) {
  const refs = (gun.mineRefs ??= []);
  refs.push(gun.part.type === 4021 ? shot : { mc: shot, x: pos.x, y: pos.y });
  if (refs.length !== 8) return;
  const oldest = refs.shift()!;
  if (!oldest) return; // A blocked null spawn has no MovieClip to expire.
  const bullet = wrapped(oldest) ? oldest.mc : oldest;
  world.addCombatEffect(oldest, 'mineExplosion', {}, false, world.currentWrapper);
  if (bullet) bullet.readyForDelete = true;
}
/** _-0D.RemoveBullet catches a raw-ref .mc lookup error and skips that owner's remaining guns. */
export function forgetLayerMine(world: World, shot: Projectile) {
  outer: for (const tank of world.field.enemies) {
    for (const gun of tank.guns)
      for (const [index, ref] of (gun.mineRefs ?? []).entries()) {
        if (!ref) continue;
        if (!wrapped(ref) || !ref.mc) continue outer;
        if (ref.mc === shot) {
          gun.mineRefs!.splice(index, 1);
          return;
        }
      }
  }
}
