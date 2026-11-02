import type { GunState, Tank, Vec } from '../core/types';
import type { World } from './world';
import { acquireBehaviorTarget, createBehaviorTarget } from './behavior-targets';
import { tankHitLocation } from './hit-location';
import { actorDirection } from './actor-movement';

/** Run and EnemyAim acquire separately; an Aim retry never aims until the next Run. */
export function weaponAimPoint(world: World, owner: Tank, gun: GunState): Vec | null {
  const state = (gun.targeting ??= createBehaviorTarget());
  const acquire = () => acquireWeaponTarget(world, owner, gun);
  if (!state.target || !world.actorParents.hasParent(state.target)) acquire();
  if (!state.target || !world.actorParents.hasParent(state.target)) {
    acquire();
    return null;
  }
  const target = state.target;
  if (gun.part.type !== 7001) return world.actorParents.point(target, world.field);

  // AllyGunAutoCannon projects both points through currentBFTarget, then adds
  // movTarget.x/y again for the flight-time estimate. Keep that source quirk.
  const origin = world.muzzle(owner, gun, 0),
    from = world.actorParents.pointAt(owner, origin, world.currentWrapper),
    detail = world.actorParents.pointAt(target, tankHitLocation(target), world.currentWrapper);
  if (!from || !detail) return null;
  const dx = target.x + detail.x - from.x,
    dy = target.y + detail.y - from.y,
    frames = Math.round(Math.sqrt(dx * dx + dy * dy) / 10) | 0;
  // PredictTargetLocation returns null for a deactivated clip, and zero motion
  // while stunned. Its two Scale calls use the base design speed, without sticky.
  if (target.dead) {
    state.target = null;
    return null;
  }
  const movement = actorDirection(
    target.rotation,
    target.stunned || target.status.stun > 0 ? 0 : target.design.speed,
  );
  movement.x *= frames;
  movement.y *= frames;
  const predicted = { x: movement.x + target.x, y: movement.y + target.y },
    vector = {
      x: detail.x - target.x + predicted.x - from.x,
      y: detail.y - target.y + predicted.y - from.y,
    };
  return {
    x: origin.x + vector.x,
    y: origin.y + vector.y,
  };
}

export function acquireWeaponTarget(world: World, owner: Tank, gun: GunState) {
  acquireBehaviorTarget(
    (gun.targeting ??= createBehaviorTarget()),
    owner.side,
    {
      avatar: world.player,
      enemies: world.currentWrapper.enemies,
      allies: world.runtimeFor(world.currentWrapper).allies,
    },
    world.rng,
  );
}

/** Enemy ally-count retargeting is after Aim, before PartCallRun and its timer. */
export function finishWeaponAim(world: World, owner: Tank, gun: GunState) {
  const state = gun.targeting!;
  if (state.master === 'enemy') {
    const count = world.runtimeFor(world.currentWrapper).allies.length;
    if (state.allies !== count) {
      acquireWeaponTarget(world, owner, gun);
      state.allies = count;
    }
  }
  return state.target;
}
