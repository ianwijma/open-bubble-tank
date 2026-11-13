import type { Field, Tank, Vec } from '../core/types';
import { displayTwips } from '../core/display-values';
import {
  DISPLAY_IDENTITY,
  displayMatrixPoint,
  displayMatrixProduct,
  inverseDisplayMatrix,
  type DisplayMatrix,
} from '../core/display-transform';
import type { World } from './world';

interface ActorParent {
  field: Field;
  members: Set<Tank>;
}
/** Enemy layers survive removal of their wrapper; actors detach only on removal/reparenting. */
export class ActorParents {
  private parents = new WeakMap<Field, ActorParent>();
  private links = new WeakMap<Tank, ActorParent>();
  private avatar?: Tank;
  private world?: World;

  private parentFor(field: Field) {
    let parent = this.parents.get(field);
    if (!parent) {
      parent = { field, members: new Set<Tank>() };
      this.parents.set(field, parent);
    }
    return parent;
  }

  /** Bind the owner; queries read current retained matrices, never reconstruct from map offsets. */
  sync(world: World) {
    this.world = world;
    this.avatar = world.player;
  }
  attach(tank: Tank, field: Field) {
    const parent = this.parentFor(field);
    this.links.get(tank)?.members.delete(tank);
    this.links.set(tank, parent);
    parent.members.add(tank);
  }
  detach(tank: Tank) {
    this.links.get(tank)?.members.delete(tank);
    this.links.delete(tank);
  }
  /** Actual enemyLayer children in addChild order, independent of Run arrays. */
  *owned(field: Field): IterableIterator<Tank> {
    yield* this.parents.get(field)?.members ?? [];
  }
  hasParent = (tank: Tank) => tank === this.avatar || this.links.has(tank);
  onStage = (tank: Tank) =>
    tank === this.avatar ||
    (this.links.has(tank) &&
      this.world?.fieldDisplays.readPose(this.links.get(tank)!.field).rooted === true);
  inField = (tank: Tank, field: Field) => {
    const parent = this.parents.get(field);
    return parent !== undefined && this.links.get(tank) === parent;
  };
  setAvatar(tank: Tank) {
    this.avatar = tank;
  }

  private project(matrix: Readonly<DisplayMatrix>, point: Readonly<Vec>): Vec {
    const result = displayMatrixPoint(matrix, {
      x: displayTwips(point.x),
      y: displayTwips(point.y),
    });
    return { x: result.x / 20, y: result.y / 20 };
  }
  private fieldMatrix(field: Field, actors = false) {
    return this.world?.worldDisplays.fieldMatrix(
      field,
      this.world.mainEffects.position,
      actors ? 'actors' : undefined,
    );
  }
  private local(point: Readonly<Vec>, field: Field) {
    const matrix = this.fieldMatrix(field),
      inverse = matrix && inverseDisplayMatrix(matrix);
    return inverse ? this.project(inverse, point) : null;
  }
  /** Wrapper Point APIs include the actual root and separate Main/World ancestors. */
  fieldGlobal(point: Vec, field: Field): Vec | null {
    const matrix = this.fieldMatrix(field);
    return matrix ? this.project(matrix, point) : null;
  }
  fieldLocal(point: Vec, field: Field): Vec | null {
    return this.local(point, field);
  }
  /** Retained actor-parent Point (not the distinct bullet sibling). */
  layerGlobal(point: Vec, field: Field): Vec | null {
    const matrix = this.fieldMatrix(field, true);
    return matrix ? this.project(matrix, point) : null;
  }
  private avatarMatrix(tank: Tank): DisplayMatrix {
    const pose = this.world?.fieldDisplays.readAvatar(tank);
    const own = pose?.pose.matrix ?? DISPLAY_IDENTITY;
    return pose?.rooted && this.world
      ? displayMatrixProduct(
          this.world.worldDisplays.worldMatrix(this.world.mainEffects.position),
          own,
        )
      : { ...own };
  }
  /** Local Point conversion follows actual actor ownership, including detached retained parents. */
  localToGlobal(tank: Tank, point: Readonly<Vec>): Vec {
    const radians = tank.rotation * (Math.PI / 180),
      cos = Math.fround(Math.cos(radians)),
      sin = Math.fround(Math.sin(radians));
    const own: DisplayMatrix = { a: cos, b: sin, c: -sin, d: cos, tx: 0, ty: 0 };
    let parent: Readonly<DisplayMatrix> = DISPLAY_IDENTITY;
    if (tank.side === 'player') parent = this.avatarMatrix(tank);
    else {
      own.tx = displayTwips(tank.x);
      own.ty = displayTwips(tank.y);
      const link = this.links.get(tank);
      if (link) parent = this.fieldMatrix(link.field, true) ?? DISPLAY_IDENTITY;
    }
    return this.project(displayMatrixProduct(parent, own), point);
  }
  /** target.parent.localToGlobal(Position) -> receiver.globalToLocal; each Point boundary rounds. */
  point(target: Tank, ownerField: Field): Vec | null {
    return this.pointAt(target, target, ownerField);
  }
  pointAt(target: Tank, point: Vec, ownerField: Field): Vec | null {
    if (target === this.avatar) {
      const avatar = this.world?.fieldDisplays.readAvatar(target);
      const own = avatar?.pose;
      const worldPoint =
        this.world &&
        this.project(this.world.worldDisplays.worldMatrix(this.world.mainEffects.position), {
          x: point.x - target.x + (own?.x ?? 0),
          y: point.y - target.y + (own?.y ?? 0),
        });
      return worldPoint ? this.local(worldPoint, ownerField) : null;
    }
    const parent = this.links.get(target);
    if (!parent) return null;
    const matrix = this.fieldMatrix(parent.field, true);
    return matrix ? this.local(this.project(matrix, point), ownerField) : null;
  }
}
