import { STAGE } from '../core/constants';
import type { GunState, Tank, Vec } from '../core/types';
import emitters from '../data/emitters.json';
import { actorDirection } from './actor-movement';
import { displayPixel } from '../core/display-values';
import { createBehaviorTarget } from './behavior-targets';
import type { World } from './world';

/** An unparented or deactivated clip read escapes Spike.BehaviorRun's listener. */
export class SpikeTargetReadError extends Error {}

/** Seven authored emitters; one hit per Run and fifteen active calls of MC-reference memory. */
export function tickSpike(world: World, owner: Tank, gun: GunState) {
  const state = (gun.targeting ??= createBehaviorTarget()),
    allies = world.runtimeFor(world.currentWrapper).allies;
  // Inherited Run calls Spike.PartCallAcquireTarget (master only), empty Aim,
  // then the enemy ally-count refresh. No ordinary target selection occurs.
  if (!state.target || !world.actorParents.hasParent(state.target)) state.master = owner.side;
  if (state.master === 'enemy' && state.allies !== allies.length) {
    state.master = owner.side;
    state.allies = allies.length;
  }
  const contacts = (gun.spikeContacts ??= []);
  gun.spikeContacts = contacts.filter((contact) => --contact.remaining !== 0);
  const avatar = world.actorParents.point(world.player, world.field);
  if (!avatar) throw new SpikeTargetReadError('Spike read an unparented avatar');
  const global = (point: Vec) => ({
    x: displayPixel(
      STAGE.cx + (point.x - avatar.x) * world.viewZoom + world.mainEffects.position.x,
    ),
    y: displayPixel(
      STAGE.cy + (point.y - avatar.y) * world.viewZoom + world.mainEffects.position.y,
    ),
  });
  const vectorLength = (v: Vec) => Math.sqrt(v.x * v.x + v.y * v.y);
  const candidates = [...allies, world.player];
  for (const target of candidates) {
    // A remembered earlier candidate returns from the whole source BehaviorRun.
    if (gun.spikeContacts.some((contact) => contact.target === target)) return;
    const center = world.actorParents.point(target, world.field);
    if (!center) throw new SpikeTargetReadError('Spike read an unparented target');
    for (let index = 0; index < emitters['4026'].length; index++) {
      const point = global(world.muzzle(owner, gun, 13, index)),
        targetPoint = global(center);
      if (!(vectorLength(targetPoint) - target.radius <= vectorLength(point) + 15)) continue;
      if (
        !world.hitTest(
          target,
          target.x + (point.x - targetPoint.x) / world.viewZoom,
          target.y + (point.y - targetPoint.y) / world.viewZoom,
        )
      )
        continue;
      world.damage(target, 3);
      // Source Damage deactivates NPC clips before BehaviorRun reads objData.numClass.
      if (target.dead && target.side !== 'player')
        throw new SpikeTargetReadError('Spike read deactivated target data after damage');
      const force = actorDirection(owner.rotation + gun.angle, 1),
        normalize = 1 / vectorLength(force);
      force.x *= normalize;
      force.y *= normalize;
      force.x *= 8 - target.design.classId;
      force.y *= 8 - target.design.classId;
      if (target.design.avatar) {
        target.velocity.x += force.x;
        target.velocity.y += force.y;
      } else {
        force.x *= 2;
        force.y *= 2;
        target.velocity = force;
      }
      gun.spikeContacts.push({ target, remaining: 15 });
      return;
    }
  }
}
