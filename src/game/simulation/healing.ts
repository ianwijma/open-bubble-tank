import { angleTo, direction, distance, length, rotate } from '../core/math';
import { FIELD_RADIUS } from '../core/constants';
import type { GunState, Projectile, Tank } from '../core/types';
import { healTank } from './tank';
import type { World } from './world';

export { healerPatient } from './healer-target';
import { healerPatient } from './healer-target';
import { actorTargetPoint, attachedTarget } from './actor-targets';

export function tickHealer(world: World, owner: Tank, gun: GunState) {
  const patient = healerPatient(world, owner, gun);
  const oldBeam = world.bullets.find((bullet) => bullet.uid === gun.beamId && !bullet.dead);
  if (!patient) {
    if (oldBeam) oldBeam.dead = true;
    gun.beamId = undefined;
    return;
  }
  if (!attachedTarget(world, patient.uid)) {
    // PartCallRun's parent.localToGlobal throws, then its catch clears and reacquires.
    if (oldBeam) oldBeam.dead = true;
    gun.beamId = gun.patientId = undefined;
    gun.patientRef = undefined;
    healerPatient(world, owner, gun);
    return;
  }
  const mount = rotate(gun.part, owner.rotation);
  gun.angle =
    angleTo({ x: owner.x + mount.x, y: owner.y + mount.y }, actorTargetPoint(world, patient)) -
    owner.rotation;
  const origin = world.muzzle(owner, gun);
  if (patient.life >= patient.maxLife || distance(origin, actorTargetPoint(world, patient)) > 400) {
    if (oldBeam) oldBeam.dead = true;
    gun.beamId = gun.patientId = undefined;
    gun.patientRef = undefined;
    healerPatient(world, owner, gun);
    return;
  }
  if (++gun.counter < 3) return;
  gun.counter = 0;
  if (oldBeam) {
    oldBeam.x = origin.x;
    oldBeam.y = origin.y;
    oldBeam.angle = owner.rotation + gun.angle;
    return;
  }
  const beam: Projectile = {
    uid: world.nextId(),
    owner: owner.uid,
    enemy: owner.side === 'enemy',
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
}

/** HealerBeam._-L2 ray-marches 3px, retaining its counter when contact is lost. */
export function tickHealingBeam(world: World, beam: Projectile, owner: Tank | undefined) {
  const patient = world.allTanks().find((tank) => tank.uid === beam.targetId);
  if (!owner || !patient || owner.status.jam > 0) {
    beam.dead = true;
    return;
  }
  const unit = direction(beam.angle),
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
    const dx = (patient.x - x) | 0,
      dy = (patient.y - y) | 0;
    const roughDistance = Math.sqrt(dx * dx + dy + dy) | 0;
    if (roughDistance <= patient.radius && world.hitTest(patient, x, y)) {
      if (beam.contactFrames === 10) {
        healTank(patient, beam.damage);
        beam.contactFrames = 0;
      } else beam.contactFrames = (beam.contactFrames ?? 0) + 1;
      return;
    }
  }
}
