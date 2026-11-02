import type { GunState, Tank } from '../core/types';
import type { World } from './world';
import { refreshBehaviorTarget } from './behavior-targets';
import { setPursuitPoint, tickSkittish, tickWallFlower } from './behavior-destinations';
import { tickPhasing } from './phasing';
import { tickHealer } from './healing';
import { actorAngle, actorHeading } from './actor-movement';
import { weaponAimFlags } from '../core/weapon-aim';

/** Registered behavior parts run after primary weapons and movement, in authored order. */
export function tickBehavior(world: World, tank: Tank, gun: GunState) {
  const state = gun.behaviorTarget!;
  if (gun.part.type === 6002) {
    // Healer's override remains in the existing beam/patient owner.
    tickHealer(world, tank, gun);
    const patient = state.target;
    const point = patient && world.actorParents.point(patient, world.field);
    if (!point) {
      state.target = null;
      gun.patientId = undefined;
    }
    setPursuitPoint(tank, point);
    return;
  }
  const target = refreshBehaviorTarget(
    state,
    tank.side,
    {
      avatar: world.player,
      enemies: world.currentWrapper.enemies,
      allies: world.runtimeFor(world.currentWrapper).allies,
    },
    world.rng,
    world.actorParents.hasParent,
    (candidate) => {
      const flags = (gun.aim ??= weaponAimFlags(gun.part.type, tank.design.classId));
      if (!flags.rotates) return;
      const point = world.actorParents.point(candidate, world.field);
      if (point)
        gun.angle = actorAngle(actorHeading(world.muzzle(tank, gun, 0), point) - tank.rotation);
    },
  );
  const point = target && world.actorParents.point(target, world.field);
  if (gun.part.type === 6001) {
    if (!point) state.target = null;
    setPursuitPoint(tank, point);
  } else if (gun.part.type === 6003) tickSkittish(tank, point, world.rng);
  else if (gun.part.type === 6004) tickPhasing(tank, gun);
  else if (gun.part.type === 6005)
    tickWallFlower(tank, gun.wallFlower!, world.currentWrapper.scale);
}
