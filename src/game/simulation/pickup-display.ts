import type { Field, Pickup, Tank } from '../core/types';
import metadata from '../data/pickup-display.json';
import type { World } from './world';
import { SwfClip } from '../assets/swf-clip';
import { buildDisplayList } from '../assets/display-list';
import type { SpriteInfo, DisplayPlacement } from '../assets/asset-pack';

const sprites = metadata.sprites as unknown as Record<number, SpriteInfo>;
const lists = new Map<string, DisplayPlacement[]>();
const sourceClips = {
  spriteInfo: (id: number) => sprites[id],
  displayList(id: number, frame: number) {
    if (!sprites[id]) return [];
    const key = `${id}:${frame}`;
    let list = lists.get(key);
    if (!list) lists.set(key, (list = buildDisplayList(sprites[id], frame)));
    return list;
  },
};
interface Clock {
  pose: SwfClip;
  born: number;
  initialized: boolean;
  advanceAt: number;
}

/** Retained numeric pose; source mechanics and host artwork entropy are distinct. */
export interface PickupClip {
  readonly symbol: number;
  readonly totalFrames: number;
  readonly registersFrame1: boolean;
  readonly pose: SwfClip;
  readonly playback: Readonly<{
    status: 'retained';
    currentFrame: number;
    entropy: 'host-artwork';
    globalSourceEntropy: 'unproved';
  }>;
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
  private cohort = 0;
  private clocks = new Set<WeakRef<Clock>>();
  /** Independent host artwork entropy. Never consumes gameplay RNG or a UID. */
  constructor(private artworkRandom: () => number = Math.random) {}
  private *liveClocks() {
    for (const reference of this.clocks) {
      const clock = reference.deref();
      if (clock) yield clock;
      else this.clocks.delete(reference);
    }
  }
  /** Before Main.Run: surviving timelines enter their next authored frame. */
  enterFrame() {
    this.cohort++;
    for (const clock of this.liveClocks())
      if (clock.initialized && this.cohort >= clock.advanceAt) clock.pose.enterFrame();
  }
  /** Initial frame scripts run after the constructor/Main listener, before EXIT.
   * A changed-frame goto releases the inside-ENTER constructor's extra frame1
   * hold; zero/one self-targets and the unscripted31-frame root retain it.
   */
  advanceArtwork() {
    for (const clock of this.liveClocks()) {
      if (!clock.initialized) {
        clock.pose.enterFrame();
        clock.pose.runFrameScripts();
        clock.initialized = true;
        clock.advanceAt = clock.born + (clock.pose.frame === 1 ? 2 : 1);
      } else clock.pose.runFrameScripts();
    }
  }

  construct(pickup: Pickup, denomination = pickup.value): PickupClip {
    const existing = this.instances.get(pickup);
    if (existing) return existing.clip;
    const source = metadata.roots.find((root) => root.value === denomination);
    if (!source) throw new Error(`Unknown pickup denomination ${denomination}`);
    const pose = new SwfClip(source.symbol, sourceClips, this.artworkRandom);
    pose.construct();
    const clock: Clock = { pose, born: this.cohort, initialized: false, advanceAt: Infinity };
    this.clocks.add(new WeakRef(clock));
    const clip: PickupClip = Object.freeze({
      symbol: source.symbol,
      totalFrames: source.frameCount,
      registersFrame1: source.registersFrame1,
      pose,
      get playback() {
        // Retaining the lifetime handle also retains its clock, even after removeChild.
        return Object.freeze({
          status: 'retained' as const,
          currentFrame: clock.pose.frame,
          entropy: 'host-artwork' as const,
          globalSourceEntropy: 'unproved' as const,
        });
      },
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
