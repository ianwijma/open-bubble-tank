import type { Field, Tank, Vec } from '../core/types';
import { STAGE } from '../core/constants';
import { displayPixel } from '../core/display-values';
import type { World } from './world';

const twips = (value: number) => Math.round(displayPixel(value) * 20);
// Pinned reference render::Matrix rounds float32 transforms to nearest, ties even.
function matrixRound(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value >= 2147483648 || value < -2147483648) return -2147483648;
  const floor = Math.floor(value),
    fraction = value - floor;
  return fraction < 0.5 ? floor : fraction > 0.5 ? floor + 1 : floor % 2 === 0 ? floor : floor + 1;
}

interface ActorParent extends Vec {
  rooted: boolean;
  members: Set<Tank>;
}
/** Enemy layers survive removal of their wrapper; actors detach only on removal/reparenting. */
export class ActorParents {
  private active = new Map<Field, ActorParent>();
  private parents = new WeakMap<Field, ActorParent>();
  private links = new WeakMap<Tank, ActorParent>();
  private observed = new WeakSet<Tank>();
  private avatar?: Tank;
  private rootOffset: Vec = { x: 0, y: 0 };

  private parentFor(field: Field) {
    let parent = this.parents.get(field);
    if (!parent) {
      parent = { x: 0, y: 0, rooted: false, members: new Set<Tank>() };
      this.parents.set(field, parent);
    }
    return parent;
  }

  sync(world: World) {
    this.avatar = world.player;
    this.rootOffset = world.mainEffects.position;
    const next = new Map<Field, ActorParent>();
    for (const { field, runtime, offset } of world.attachedFields()) {
      const parent = this.parentFor(field);
      parent.rooted = true;
      parent.x = displayPixel(offset.x - world.player.x);
      parent.y = displayPixel(offset.y - world.player.y);
      const members = new Set([...field.enemies, ...runtime.allies]);
      for (const tank of parent.members)
        if (!members.has(tank) && this.links.get(tank) === parent) this.links.delete(tank);
      parent.members = new Set();
      for (const tank of members) {
        const previous = this.links.get(tank);
        // Arrays can still reference an actor reparented by a later _-G0.
        // Only attachment/reparenting moves an existing clip between layers.
        if ((previous && previous !== parent) || (!previous && this.observed.has(tank))) continue;
        this.observed.add(tank);
        this.links.set(tank, parent);
        parent.members.add(tank);
      }
      next.set(field, parent);
    }
    for (const [field, parent] of this.active) if (!next.has(field)) parent.rooted = false;
    this.active = next;
  }
  attach(tank: Tank, field: Field) {
    const parent = this.parentFor(field);
    this.links.get(tank)?.members.delete(tank);
    this.links.set(tank, parent);
    this.observed.add(tank);
    parent.members.add(tank);
  }
  detach(tank: Tank) {
    this.links.get(tank)?.members.delete(tank);
    this.links.delete(tank);
    this.observed.add(tank);
  }
  hasParent = (tank: Tank) => tank === this.avatar || this.links.has(tank);
  onStage = (tank: Tank) => tank === this.avatar || this.links.get(tank)?.rooted === true;
  inField = (tank: Tank, field: Field) => {
    const parent = this.parents.get(field);
    return parent !== undefined && this.links.get(tank) === parent;
  };
  setAvatar(tank: Tank) {
    this.avatar = tank;
  }

  /** Active field layer -> stage Point, independent of the user's render zoom. */
  fieldGlobal(point: Vec, field: Field): Vec | null {
    const parent = this.active.get(field);
    if (!parent) return null;
    return {
      x: ((twips(point.x) + twips(parent.x) + twips(STAGE.cx + this.rootOffset.x)) | 0) / 20,
      y: ((twips(point.y) + twips(parent.y) + twips(STAGE.cy + this.rootOffset.y)) | 0) / 20,
    };
  }
  fieldLocal(point: Vec, field: Field): Vec | null {
    const parent = this.active.get(field);
    if (!parent) return null;
    return {
      x: ((twips(point.x) - twips(parent.x) - twips(STAGE.cx + this.rootOffset.x)) | 0) / 20,
      y: ((twips(point.y) - twips(parent.y) - twips(STAGE.cy + this.rootOffset.y)) | 0) / 20,
    };
  }
  /** Local Point conversion remains valid after a clip's parent detaches. */
  localToGlobal(tank: Tank, point: Readonly<Vec>): Vec {
    const radians = tank.rotation * (Math.PI / 180),
      cos = Math.fround(Math.cos(radians)),
      sin = Math.fround(Math.sin(radians)),
      x = Math.fround(twips(point.x)),
      y = Math.fround(twips(point.y)),
      rx = matrixRound(Math.fround(Math.fround(cos * x) + Math.fround(-sin * y))),
      ry = matrixRound(Math.fround(Math.fround(sin * x) + Math.fround(cos * y))),
      avatar = tank.side === 'player',
      parent = this.links.get(tank),
      rooted = avatar ? tank === this.avatar : parent?.rooted === true;
    // Avatar has its own origin during active gameplay. Collapse's separate
    // listener suspends projectile Run and resets that local pose before resuming.
    const tx = avatar ? 0 : twips(tank.x) + (parent ? twips(parent.x) : 0),
      ty = avatar ? 0 : twips(tank.y) + (parent ? twips(parent.y) : 0);
    return {
      x: ((rx + tx + (rooted ? twips(STAGE.cx + this.rootOffset.x) : 0)) | 0) / 20,
      y: ((ry + ty + (rooted ? twips(STAGE.cy + this.rootOffset.y) : 0)) | 0) / 20,
    };
  }

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
