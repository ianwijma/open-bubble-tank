import type { Field, Vec } from '../core/types';
import type { World } from '../simulation/world';
import { STAGE } from '../core/constants';
import {
  displayMatrixPoint,
  displayMatrixProduct,
  type DisplayMatrix,
} from '../core/display-transform';
import { displayTwips } from '../core/display-values';
import type { FieldSlot } from '../simulation/field-display';
import type { WorldLayerKind } from '../simulation/world-display';

export interface FieldTransform extends Vec {
  scale: number;
  alpha?: number;
  /** World-local effective matrix; view zoom is applied by the renderer's World container. */
  matrix?: Readonly<DisplayMatrix>;
  inputOrigin?: Readonly<Vec>;
}
/** Remove the fixed World origin from source stage matrices; Main/zoom stay view ancestors. */
export function matrixTransform(stage: Readonly<DisplayMatrix>, alpha = 1): FieldTransform {
  const matrix = { ...stage, tx: stage.tx - STAGE.cx * 20, ty: stage.ty - STAGE.cy * 20 };
  return {
    x: matrix.tx / 20,
    y: matrix.ty / 20,
    scale: matrix.a,
    alpha,
    matrix,
  };
}
/** Actual field/slot transforms; map offsets and frame counters are not display poses. */
export function fieldTransform(world: World, field: Field, slot?: FieldSlot): FieldTransform {
  const read = world.fieldDisplays.read(field);
  return matrixTransform(
    world.worldDisplays.fieldMatrix(field, { x: 0, y: 0 }, slot),
    read.root.pose.alpha * (slot ? read.slots[slot].pose.alpha : 1),
  );
}
export function worldLayerTransform(
  world: World,
  field: Field,
  kind: Exclude<WorldLayerKind, 'screen'>,
) {
  const layer = world.worldDisplays.read(field, kind);
  return matrixTransform(
    world.worldDisplays.layerMatrix(field, kind, { x: 0, y: 0 }),
    layer.pose.alpha,
  );
}
export function bottomTransform(world: World, field: Field) {
  const read = world.fieldDisplays.read(field);
  return matrixTransform(
    world.worldDisplays.bottomMatrix(field, { x: 0, y: 0 }),
    read.root.pose.alpha * read.slots.underEffects.pose.alpha * read.bottom.pose.alpha,
  );
}
export function avatarTransform(world: World): FieldTransform {
  const pose = world.fieldDisplays.readAvatar().pose;
  const transform = matrixTransform(
    {
      ...pose.matrix,
      tx: pose.matrix.tx + STAGE.cx * 20,
      ty: pose.matrix.ty + STAGE.cy * 20,
    },
    pose.alpha,
  );
  transform.inputOrigin = { x: world.player.x, y: world.player.y };
  return transform;
}
export function tutorialTransform(world: World, field: Field) {
  const read = world.fieldDisplays.read(field);
  const slot = read.tutorial.parent === read.root.id ? undefined : 'actors';
  return matrixTransform(
    displayMatrixProduct(
      world.worldDisplays.fieldMatrix(field, { x: 0, y: 0 }, slot),
      read.tutorial.pose.matrix,
    ),
    read.root.pose.alpha * (slot ? read.slots[slot].pose.alpha : 1) * read.tutorial.pose.alpha,
  );
}
export function fieldPoint<T extends Vec>(point: T, transform: FieldTransform): T {
  if (transform.matrix) {
    const source = displayMatrixPoint(transform.matrix, {
      x: displayTwips(point.x - (transform.inputOrigin?.x ?? 0)),
      y: displayTwips(point.y - (transform.inputOrigin?.y ?? 0)),
    });
    return { ...point, x: source.x / 20, y: source.y / 20 };
  }
  return transform.x || transform.y || transform.scale !== 1
    ? {
        ...point,
        x: transform.x + point.x * transform.scale,
        y: transform.y + point.y * transform.scale,
      }
    : point;
}
