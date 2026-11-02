import { length, rotate } from '../core/math';
import { actorAngle, actorDirection, actorHeading } from './actor-movement';
import { FIELD_RADIUS } from '../core/constants';
import type { GunState, Projectile, Tank } from '../core/types';
import { healTank } from './tank';
import type { World } from './world';
import { createBehaviorTarget } from './behavior-targets';
import { acquireHealerTarget, HealerTargetReadError } from './healer-target';

/** The ID is compatibility/fixture metadata; the stored source target object owns selection. */
export function healerPatient(world: World, owner: Tank, gun: GunState): Tank | undefined {
  const state = (gun.behaviorTarget ??= createBehaviorTarget());
  const patient = acquireHealerTarget(
    state,
    owner,
    {
      avatar: world.player,
      enemies: world.currentWrapper.enemies,
      allies: world.runtimeFor(world.currentWrapper).allies,
    },
    world.rng,
  );
  gun.patientId = patient?.uid;
  return patient ?? undefined;
}

export function tickHealer(world: World, owner: Tank, gun: GunState) {
  let patient = healerPatient(world, owner, gun);
  // Weapon.Run checks first, then EnemyAim repeats the acquisition before aiming.
  if (!patient || !world.actorParents.hasParent(patient))
    patient = healerPatient(world, owner, gun);
  const point = patient && world.actorParents.point(patient, world.field);
  if (point) {
    const mount = rotate(gun.part, owner.rotation);
    gun.angle = actorAngle(
      actorHeading({ x: owner.x + mount.x, y: owner.y + mount.y }, point) - owner.rotation,
    );
  }
  const state = gun.behaviorTarget!,
    count = world.runtimeFor(world.currentWrapper).allies.length;
  if (state.master === 'enemy' && state.allies !== count) {
    patient = healerPatient(world, owner, gun);
    state.allies = count;
  }
  const oldBeam = world.bullets.find((bullet) => bullet.uid === gun.beamId && !bullet.dead);
  const stop = () => {
    if (oldBeam) {
      oldBeam.dead = true;
      world.removeBullet(oldBeam);
    }
    gun.beamId = undefined;
  };
  const reacquire = (retryReadError: boolean) => {
    let caught = false;
    stop();
    state.target = null;
    gun.patientId = undefined;
    try {
      healerPatient(world, owner, gun);
    } catch (error) {
      if (!retryReadError || !(error instanceof HealerTargetReadError)) throw error;
      caught = true;
      // Full/range acquisition is inside PartCallRun's try; its catch retries once.
      state.target = null;
      healerPatient(world, owner, gun);
    }
    return caught;
  };
  if (!patient) return;
  const origin = world.muzzle(owner, gun);
  if (patient.life === patient.maxLife) {
    reacquire(true);
    return;
  }
  if (!point) {
    reacquire(false);
    return;
  } // Source parent.localToGlobal throws into PartCallRun's catch.
  const dx = origin.x - point.x,
    dy = origin.y - point.y;
  if (dx * dx + dy * dy > 160000) {
    reacquire(true);
    return;
  }
  if (++gun.counter < 3) return;
  if (gun.beamId !== undefined && !oldBeam) {
    // The source retains beam_mc until PartCallTrigger sees its missing parent.
    // A trigger read is inside PartCallRun's try, and its exception bypasses
    // RunStandardPartTimer's post-trigger counter reset even when catch recovers.
    if (!reacquire(true)) gun.counter = 0;
    return;
  }
  if (oldBeam) {
    oldBeam.x = origin.x;
    oldBeam.y = origin.y;
    oldBeam.angle = owner.rotation + gun.angle;
    gun.counter = 0;
    return;
  }
  const beam: Projectile = {
    uid: world.nextId(),
    owner: owner.uid,
    enemy: state.master === 'enemy',
    x: origin.x,
    y: origin.y,
    angle: owner.rotation + gun.angle,
    heading: owner.rotation + gun.angle,
    speed: 0,
    damage: 1,
    radius: 0,
    age: 0,
    life: Infinity,
    kind: 'healBeam',
    explode: 0,
    targetId: patient.uid,
    healingTarget: patient,
    hit: new Set(),
    dead: false,
    anchor: gun,
    symbol: 2015,
    artScale: 1,
    orbit: 0,
    contactFrames: 0,
    beamLength: 0,
  };
  gun.beamId = beam.uid;
  world.addBullet(beam);
  gun.counter = 0;
}

/** HealerBeam._-L2 ray-marches 3px, retaining its counter when contact is lost. */
export function tickHealingBeam(world: World, beam: Projectile, owner: Tank | undefined) {
  const patient = beam.healingTarget ?? world.allTanks().find((tank) => tank.uid === beam.targetId);
  const point = patient && world.actorParents.point(patient, world.field);
  if (!owner || !patient || !point || owner.status.jam > 0) {
    beam.dead = true;
    return;
  }
  const unit = actorDirection(beam.angle, 1),
    radius = FIELD_RADIUS * world.field.scale;
  for (let n = 0; n < radius * 2; n += 3) {
    const x = beam.x + unit.x * n,
      y = beam.y + unit.y * n;
    beam.beamLength = n;
    if (length({ x, y }) > radius) {
      beam.beamLength = Math.max(0, n - 5);
      return;
    }
    // Verified in HealerBeam.pcode: dy is added twice, not squared; convert_i maps NaN to 0.
    const dx = (point.x - x) | 0,
      dy = (point.y - y) | 0;
    const roughDistance = Math.sqrt(dx * dx + dy + dy) | 0;
    if (
      roughDistance <= patient.radius &&
      world.hitTest(patient, x + patient.x - point.x, y + patient.y - point.y)
    ) {
      if (beam.contactFrames === 10) {
        healTank(patient, beam.damage);
        beam.contactFrames = 0;
      } else beam.contactFrames = (beam.contactFrames ?? 0) + 1;
      return;
    }
  }
}
