import type { Field, Pickup, Tank } from '../core/types';
import metadata from '../data/pickup-display.json';
import type { World } from './world';

/** This is source registration metadata, NOT a qualified current native clip pose. */
export interface PickupClip {
  readonly symbol: number;
  readonly totalFrames: number;
  readonly registersFrame1: boolean;
  readonly playback: Readonly<{
    status: 'unresolved';
    currentFrame: null;
    reason: 'constructor-frame-script-entropy-and-stage-scheduling';
  }>;
  /** Deliberate static presentation until the original clock/entropy boundary is qualified. */
  readonly presentation: Readonly<{ kind: 'held-authored-preview'; frame: 1 }>;
}
interface Instance {
  clip: PickupClip;
  parent: Field | null;
  callbackField: Field | null;
  avatar: Tank | null;
}
export class PickupChildRemovalError extends Error {
  constructor() {
    super('Bubblefield removal callback no longer owns its pickup child');
  }
}

/** Actual lifeBubbleLayer children and clip lifetimes, independent of _-Ym/Run and gameplay UIDs.
 * No read discovers children, draws entropy, advances a clock or constructs artwork.
 */
export class PickupDisplays {
  private instances = new WeakMap<Pickup, Instance>();
  private layers = new WeakMap<Field, Set<Pickup>>();

  construct(pickup: Pickup, denomination = pickup.value): PickupClip {
    const existing = this.instances.get(pickup);
    if (existing) return existing.clip;
    const source = metadata.roots.find((root) => root.value === denomination);
    if (!source) throw new Error(`Unknown pickup denomination ${denomination}`);
    const clip: PickupClip = Object.freeze({
      symbol: source.symbol,
      totalFrames: source.frameCount,
      registersFrame1: source.registersFrame1,
      playback: Object.freeze({
        status: 'unresolved',
        currentFrame: null,
        reason: 'constructor-frame-script-entropy-and-stage-scheduling',
      }),
      presentation: Object.freeze({ kind: 'held-authored-preview', frame: 1 }),
    });
    this.instances.set(pickup, { clip, parent: null, callbackField: null, avatar: null });
    return clip;
  }
  private instance(pickup: Pickup) {
    const instance = this.instances.get(pickup);
    if (!instance) throw new Error('Pickup display must be explicitly constructed before use');
    return instance;
  }
  attach(pickup: Pickup, field: Field) {
    const instance = this.instance(pickup);
    if (instance.parent) this.layers.get(instance.parent)!.delete(pickup);
    let children = this.layers.get(field);
    if (!children) this.layers.set(field, (children = new Set()));
    children.add(pickup);
    instance.parent = field;
  }
  /** _-Pu.Setup: denomination, callback, then avatar. No parenting or timeline writes. */
  setup(pickup: Pickup, value: number, callbackField: Field, avatar: Tank) {
    const instance = this.instance(pickup);
    pickup.value = value;
    instance.callbackField = callbackField;
    instance.avatar = avatar;
  }
  resetAvatar(pickup: Pickup, avatar: Tank) {
    this.instance(pickup).avatar = avatar;
  }
  remove(pickup: Pickup, field: Field) {
    const instance = this.instances.get(pickup);
    if (!instance || instance.parent !== field) throw new PickupChildRemovalError();
    this.layers.get(field)!.delete(pickup);
    instance.parent = null;
  }
  *owned(field: Field): IterableIterator<Pickup> {
    yield* this.layers.get(field) ?? [];
  }
  read(pickup: Pickup) {
    const instance = this.instances.get(pickup);
    return instance
      ? Object.freeze({ pickup, symbol: instance.clip.symbol, ...instance })
      : undefined;
  }
}

/** _-Yz removes the vector's actual references before replacing the vector.
 * An array-only removed display child survives; an invalid removeChild interrupts cleanup.
 */
export function clearPickups(world: World, field: Field) {
  const runtime = world.runtimeFor(field);
  for (const pickup of runtime.pickups) world.pickupDisplays.remove(pickup, field);
  runtime.pickups = [];
}
