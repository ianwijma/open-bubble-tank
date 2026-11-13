import {
  displayGeometryBounds,
  displayGeometryHit,
  type DisplayGeometryContent,
  type DisplayGeometryNode,
} from '../core/display-geometry';
import { RetainedTransform } from '../core/retained-transform';
import type { Field, Vec } from '../core/types';
import {
  readFieldPopulation,
  type ActorFieldPopulation,
  type AuthoredFieldPopulation,
  type EffectFieldPopulation,
  type FieldPopulationNode,
  type PickupFieldPopulation,
  type TutorialFieldPopulation,
} from './field-population';
import type { World } from './world';

/** Every source must supply actual geometry or an explicitly known empty clip.
 * Missing/unsupported content must throw; no circle, AABB hit or alpha fallback.
 */
export interface FieldGeometrySource {
  authored(node: AuthoredFieldPopulation): DisplayGeometryContent;
  tutorial(node: TutorialFieldPopulation): DisplayGeometryContent;
  actor(node: ActorFieldPopulation): DisplayGeometryContent;
  pickup(node: PickupFieldPopulation): DisplayGeometryContent;
  effect(node: EffectFieldPopulation): DisplayGeometryContent;
}

function compile(node: FieldPopulationNode, source: FieldGeometrySource): DisplayGeometryNode {
  if (node.kind === 'authored' || node.kind === 'tutorial')
    return {
      matrix: node.pose.matrix,
      depth: node.depth,
      clipDepth: node.clipDepth,
      content:
        node.kind === 'tutorial'
          ? source.tutorial(node)
          : node.children.length
            ? { kind: 'container', children: node.children.map((child) => compile(child, source)) }
            : source.authored(node),
    };
  const pose = new RetainedTransform(),
    transform = node.transform;
  pose.x = transform.x;
  pose.y = transform.y;
  pose.scaleX = pose.scaleY = transform.scale;
  pose.rotation = transform.rotation;
  return {
    matrix: pose.read().matrix,
    content:
      node.kind === 'actor'
        ? source.actor(node)
        : node.kind === 'pickup'
          ? source.pickup(node)
          : source.effect(node),
  };
}

/** Compile afresh at each call: source callbacks and field phases can change
 * physical children between queries. This does not install a gameplay adapter.
 */
export function readFieldGeometry(world: World, field: Field, source: FieldGeometrySource) {
  return compile(readFieldPopulation(world, field), source);
}
export function fieldScriptBounds(world: World, field: Field, source: FieldGeometrySource) {
  return displayGeometryBounds(readFieldGeometry(world, field, source));
}
/** Internal stage-space query. Public AVM2 player-root argument mapping must be
 * bound separately before replacing source hitTestPoint gameplay calls.
 */
export function fieldStageShapeHit(
  world: World,
  field: Field,
  source: FieldGeometrySource,
  stagePoint: Readonly<Vec>,
) {
  // Qualified public shape queries require a stage-attached receiver. A detached
  // mask reference is handled separately inside the internal geometry traversal.
  if (!world.fieldDisplays.readPose(field).rooted) return false;
  return displayGeometryHit(
    readFieldGeometry(world, field, source),
    stagePoint,
    world.worldDisplays.worldMatrix(world.mainEffects.position),
  );
}
