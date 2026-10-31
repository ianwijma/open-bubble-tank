import type { GunState, Tank, Vec } from '../core/types';
import type { World } from './world';
import { attachedTarget, actorTargetPoint } from './actor-targets';
import { healerPatient } from './healer-target';
import { tankHitLocation } from './hit-location';
import { direction } from '../core/math';

export function weaponTarget(world: World, gun: GunState) {
  return gun.part.type === 6002
    ? (gun.patientRef ?? attachedTarget(world, gun.patientId))
    : attachedTarget(world, gun.targeting?.targetId);
}
/** Weapon.AcquireTarget: source current-wrapper arrays and inclusive enemy ally index. */
export function acquireWeaponTarget(world: World, tank: Tank, gun: GunState) {
  const state = gun.targeting!;
  state.targetId = null;
  if (gun.part.type === 6002) {
    state.targetId = healerPatient(world, tank, gun)?.uid ?? null;
    return;
  }
  const allies = world.runtimeFor(world.currentWrapper).allies,
    enemies = world.currentWrapper.enemies;
  if (tank.side === 'enemy') {
    state.targetId = world.player.uid;
    if (world.rng.int(1, 2) === 1 && allies.length)
      state.targetId = allies[world.rng.int(0, allies.length)]?.uid ?? null;
  } else if (tank.side === 'ally' && enemies.length)
    state.targetId = enemies[world.rng.int(0, enemies.length - 1)]?.uid ?? null;
}
/** Run retries a detached target, then EnemyAim can retry again without aiming that frame. */
export function weaponAimPoint(world: World, tank: Tank, gun: GunState): Vec | null {
  gun.targeting ??= { targetId: null, allies: 0 };
  const before = weaponTarget(world, gun);
  if (!before || !attachedTarget(world, before.uid)) acquireWeaponTarget(world, tank, gun);
  const target = weaponTarget(world, gun);
  if (!target || !attachedTarget(world, target.uid)) {
    acquireWeaponTarget(world, tank, gun);
    return null;
  }
  const center = actorTargetPoint(world, target);
  if (gun.part.type !== 7001) return center;
  // AllyGunAutoCannon's range estimate adds the target center a second time.
  const detail = tankHitLocation(target),
    origin = world.muzzle(tank, gun, 0),
    point = { x: center.x + detail.x - target.x, y: center.y + detail.y - target.y },
    frames = Math.round(
      Math.hypot(target.x + point.x - origin.x, target.y + point.y - origin.y) / 10,
    ),
    speed =
      target.stunned || target.status.stun > 0
        ? 0
        : target.design.speed * (target.status.sticky > 0 ? 0.3 : 1),
    movement = direction(target.rotation, speed * frames);
  return { x: point.x + movement.x, y: point.y + movement.y };
}
/** Enemy Run changes targets after Aim when the current wrapper's ally count changes. */
export function finishWeaponAim(world: World, tank: Tank, gun: GunState) {
  const state = gun.targeting!;
  if (tank.side === 'enemy') {
    const count = world.runtimeFor(world.currentWrapper).allies.length;
    if (state.allies !== count) {
      acquireWeaponTarget(world, tank, gun);
      state.allies = count;
    }
  }
  return weaponTarget(world, gun);
}
