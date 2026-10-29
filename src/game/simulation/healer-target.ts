import type { GunState, Tank } from '../core/types';
import type { World } from './world';
import { attachedTarget } from './actor-targets';

/** EBehaviorHealer owns a patient independently of the tank's offensive weapons. */
export function healerPatient(world: World, owner: Tank, gun: GunState): Tank | undefined {
  if (gun.patientRef && gun.patientRef.uid === gun.patientId) return gun.patientRef;
  const team =
    owner.side === 'enemy'
      ? world.currentWrapper.enemies
      : [world.player, ...world.runtimeFor(world.currentWrapper).allies];
  let patient = attachedTarget(world, gun.patientId);
  if (!patient) {
    const injured = team.filter((tank) => tank !== owner && !tank.dead && tank.life < tank.maxLife);
    // Enemy healers take the first patient; allied healers prioritize the avatar.
    // The shipped ally Array[1..length] bug is bounded to valid injured allies.
    patient =
      owner.side === 'enemy' || injured[0] === world.player
        ? injured[0]
        : injured.length
          ? world.rng.pick(injured)
          : undefined;
    gun.patientId = patient?.uid;
  }
  gun.patientRef = patient;
  return patient;
}
