import type { Field, Tank, Vec } from '../core/types';
import { STAGE } from '../core/constants';
import { displayPixel } from '../core/display-values';
import type { World } from './world';

interface ActorParent extends Vec {
  rooted: boolean;
  members: Set<Tank>;
}
/** Enemy layers survive removal of their wrapper; actors detach only on removal/reparenting. */
export class ActorParents {
  private active = new Map<Field, ActorParent>();
  private links = new WeakMap<Tank, ActorParent>();
  private avatar?: Tank;

  sync(world: World) {
    this.avatar = world.player;
    const next = new Map<Field, ActorParent>();
    for (const { field, runtime, offset } of world.activeFields()) {
      const parent = this.active.get(field) ?? {
        x: 0,
        y: 0,
        rooted: true,
        members: new Set<Tank>(),
      };
      parent.x = displayPixel(offset.x - world.player.x);
      parent.y = displayPixel(offset.y - world.player.y);
      const members = new Set([...field.enemies, ...runtime.allies]);
      for (const tank of parent.members)
        if (!members.has(tank) && this.links.get(tank) === parent) this.links.delete(tank);
      parent.members = members;
      for (const tank of members) {
        const previous = this.links.get(tank);
        if (previous && previous !== parent) previous.members.delete(tank);
        this.links.set(tank, parent);
      }
      next.set(field, parent);
    }
    for (const [field, parent] of this.active) if (!next.has(field)) parent.rooted = false;
    this.active = next;
  }
  attach(tank: Tank, field: Field) {
    const parent = this.active.get(field);
    if (!parent) return;
    this.links.get(tank)?.members.delete(tank);
    this.links.set(tank, parent);
    parent.members.add(tank);
  }
  detach(tank: Tank) {
    this.links.get(tank)?.members.delete(tank);
    this.links.delete(tank);
  }
  hasParent = (tank: Tank) => tank === this.avatar || this.links.has(tank);

  /** Source parent.localToGlobal -> owner.parent.globalToLocal crosses twip Point boundaries. */
  point(target: Tank, ownerField: Field): Vec | null {
    return this.pointAt(target, target, ownerField);
  }
  /** A transformed detail or mount point, expressed in the actor parent coordinates. */
  pointAt(target: Tank, point: Vec, ownerField: Field): Vec | null {
    const to = this.active.get(ownerField);
    if (!to) return null;
    if (target === this.avatar) return { x: -to.x || 0, y: -to.y || 0 };
    const from = this.links.get(target);
    if (!from) return null;
    const twips = (value: number) => Math.round(displayPixel(value) * 20);
    const project = (value: number, origin: number, owner: number, center: number) => {
      const global = (twips(value) + twips(origin) + (from.rooted ? center * 20 : 0)) / 20;
      return (twips(global) - twips(owner) - center * 20) / 20;
    };
    return {
      x: project(point.x, from.x, to.x, STAGE.cx),
      y: project(point.y, from.y, to.y, STAGE.cy),
    };
  }
}
