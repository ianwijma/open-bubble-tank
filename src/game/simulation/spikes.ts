import { STAGE } from '../core/constants';
import { direction, length } from '../core/math';
import type { GunState, Tank, Vec } from '../core/types';
import emitters from '../data/emitters.json';
import { actorTargetPoint } from './actor-targets';
import type { World } from './world';

/** EGunSpike.BehaviorRun: seven points, one contact per Run, per-target15-call memory. */
export function tickSpike(world: World, owner: Tank, gun: GunState) {
  const contacts = (gun.spikeContacts ??= []);
  gun.spikeContacts = contacts.filter((contact) => --contact.remaining !== 0);
  const global = (point: Vec) => ({
    x: STAGE.cx + (point.x - world.player.x) * world.viewZoom + world.mainEffects.position.x,
    y: STAGE.cy + (point.y - world.player.y) * world.viewZoom + world.mainEffects.position.y,
  });
  const candidates = [...world.runtimeFor(world.currentWrapper).allies, world.player];
  for (const target of candidates) {
    // The source returns from BehaviorRun when an earlier candidate is still remembered.
    if (gun.spikeContacts.some((contact) => contact.uid === target.uid)) return;
    const center = actorTargetPoint(world, target),
      offset = { x: center.x - target.x, y: center.y - target.y };
    for (let i = 0; i < emitters['4026'].length; i++) {
      const point = world.muzzle(owner, gun, 13, i);
      if (!(length(global(center)) - target.radius <= length(global(point)) + 15)) continue;
      if (!world.hitTest(target, point.x - offset.x, point.y - offset.y)) continue;
      world.damage(target, 3);
      const force = direction(owner.rotation + gun.angle, 8 - target.design.classId);
      if (target.design.avatar) {
        target.velocity.x += force.x;
        target.velocity.y += force.y;
      } else target.velocity = { x: force.x * 2, y: force.y * 2 };
      gun.spikeContacts.push({ uid: target.uid, remaining: 15 });
      return;
    }
  }
}
