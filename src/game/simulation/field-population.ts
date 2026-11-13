import type { SwfClip } from '../assets/swf-clip';
import type { Field, Pickup, Tank } from '../core/types';
import type { FieldInstanceRead } from './field-display';
import { isArtwork, type EffectClip } from './registered-effects';
import type { World } from './world';

/** A transient population read, never an ownership registry or a geometric result. */
export interface AuthoredFieldPopulation extends Omit<FieldInstanceRead, 'children'> {
  readonly kind: 'authored';
  readonly children: readonly FieldPopulationNode[];
}
export interface TutorialFieldPopulation extends Omit<FieldInstanceRead, 'children'> {
  readonly kind: 'tutorial';
  readonly sourceFrame: number;
  readonly stopped: true;
  readonly children: readonly FieldPopulationNode[];
}
export interface PopulationTransform {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly scale: number;
  readonly alpha: number;
}
interface PositionedPopulation {
  readonly transform: Readonly<PopulationTransform>;
}
export interface ActorFieldPopulation extends PositionedPopulation {
  readonly kind: 'actor';
  readonly instance: Tank;
  readonly children: readonly Tank['displayChildren'][number][];
}
export interface PickupFieldPopulation extends PositionedPopulation {
  readonly kind: 'pickup';
  readonly instance: Pickup;
  readonly symbol: number;
  /** The existing owner supplies this retained tree; reading never initializes it. */
  readonly pose: SwfClip;
}
export interface EffectFieldPopulation extends PositionedPopulation {
  readonly kind: 'effect' | 'carrier';
  readonly instance: EffectClip;
  /** Generic artwork pose qualification/expansion remains the geometry provider's work. */
}
export type FieldPopulationNode =
  | AuthoredFieldPopulation
  | TutorialFieldPopulation
  | ActorFieldPopulation
  | PickupFieldPopulation
  | EffectFieldPopulation;

function transform(source: {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  alpha?: number;
}): Readonly<PopulationTransform> {
  return Object.freeze({
    x: source.x ?? 0,
    y: source.y ?? 0,
    rotation: source.rotation ?? 0,
    scale: source.scale ?? 1,
    alpha: source.alpha ?? 1,
  });
}

/**
 * Merge the actual wrapper/actor/pickup/engine owners at their physical slots.
 * Run arrays, map coordinates, UIDs, dead/alpha flags and request contexts never
 * determine membership. Read again after any callback that can mutate displays.
 * This supplies population only: consumers still need qualified leaf geometry,
 * per-instance artwork, depth masks and separate hit/Script-width arithmetic.
 */
export function readFieldPopulation(world: World, field: Field): AuthoredFieldPopulation {
  world.fieldDisplays.requireResolvedGeometry(field);
  const state = world.fieldDisplays.read(field);
  const project = (node: FieldInstanceRead): AuthoredFieldPopulation | TutorialFieldPopulation => {
    const children: FieldPopulationNode[] = node.children.map(project);
    if (node.id === state.slots.actors.id)
      for (const instance of world.actorParents.owned(field))
        children.push(
          Object.freeze({
            kind: 'actor',
            instance,
            transform: transform(instance),
            children: Object.freeze([...instance.displayChildren]),
          }),
        );
    if (node.id === state.slots.life.id)
      for (const instance of world.pickupDisplays.owned(field)) {
        const retained = world.pickupDisplays.read(instance)!;
        children.push(
          Object.freeze({
            kind: 'pickup',
            instance,
            symbol: retained.symbol,
            pose: retained.clip.pose,
            transform: transform(instance),
          }),
        );
      }
    if (node.id === state.bottom.id) {
      const layer = world.effectEngine.layer(field, 'bottom');
      if (layer)
        for (const instance of world.effectEngine.owned(layer))
          children.push(
            Object.freeze({
              kind: isArtwork(instance) ? 'effect' : 'carrier',
              instance,
              transform: transform(instance),
            }),
          );
    }
    if (node.id === state.tutorial.id)
      return Object.freeze({
        ...node,
        kind: 'tutorial',
        sourceFrame: state.tutorial.sourceFrame,
        stopped: true,
        children: Object.freeze(children),
      });
    return Object.freeze({ ...node, kind: 'authored', children: Object.freeze(children) });
  };
  // A field root is1551; its1667 tutorial is a separate child identity.
  return project(state.root) as AuthoredFieldPopulation;
}
