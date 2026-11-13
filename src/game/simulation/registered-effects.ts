import { displayPixel } from '../core/display-values';
import { EffectPlayback } from './effect-playback';
import type { Effect, Field, GunState, Tank } from '../core/types';

export type EffectLayerName = NonNullable<Effect['layer']>;
export interface PendingEffect {
  kind?: 'shield';
  owner: Tank;
  gun: GunState;
  frame: number;
  total: number;
  x?: number;
  y?: number;
  rotation?: number;
}
export type EffectClip = Effect | PendingEffect;
/** _-0D retains both the original object and the supplied registration writes. */
export interface EffectRequest {
  readonly clip: EffectClip;
  readonly x: number;
  readonly y: number;
  readonly name: EffectLayerName;
  readonly randomRotation: boolean;
  readonly callback?: () => void;
}

/** A concrete Sprite instance, independent of the engine's name registration. */
export interface EffectLayer {
  readonly kind: EffectLayerName;
  readonly field?: Field;
}
interface Completion {
  readonly clip: EffectClip;
  readonly name: EffectLayerName;
  /** Compatibility read grouping, never the clip's physical parent. */
  readonly context: Field;
  readonly callback?: () => void;
}
export class EffectLayerReadError extends Error {}
export class EffectChildRemovalError extends Error {}
export class EffectCompletionReadError extends Error {}

export const isArtwork = (clip: EffectClip): clip is Effect => 'duration' in clip;

/** _-2c: ordered completion records and actual layer children are separate. */
export class RegisteredEffects {
  readonly artwork = new EffectPlayback();
  private cohort = 0;
  private clocks = new WeakSet<PendingEffect>();
  private registered: EffectLayer[] = [];
  private completions: Completion[] = [];
  private parents = new WeakMap<EffectClip, EffectLayer>();
  private members = new WeakMap<EffectLayer, Set<EffectClip>>();
  private fieldLayers = new WeakMap<Field, { top: EffectLayer; bottom: EffectLayer }>();
  private attached = new WeakSet<EffectLayer>();
  readonly screen = this.createLayer('screen');

  /** Only a numeric stage epoch is retained: expired clips are never rooted here.
   * Before-ENTER construction first presents frame1 in the next cohort. Inside
   * ENTER construction also presents frame1 in that cohort (measured separately).
   */
  constructCarrier<T extends PendingEffect>(clip: T): T {
    if (this.clocks.has(clip)) return clip;
    const born = this.cohort;
    let origin = clip.frame,
      advancedAt = born + 1;
    Object.defineProperty(clip, 'frame', {
      enumerable: true,
      configurable: false,
      get: () => ((origin - 1 + Math.max(0, this.cohort - advancedAt)) % clip.total) + 1,
      set: (frame: number) => {
        origin = frame;
        advancedAt = Math.max(born + 1, this.cohort);
      },
    });
    this.clocks.add(clip);
    return clip;
  }
  enterFrame() {
    this.cohort++;
    this.artwork.enterFrame();
  }

  private createLayer(kind: EffectLayerName, field?: Field): EffectLayer {
    const layer = Object.freeze({ kind, field });
    this.members.set(layer, new Set());
    this.attached.add(layer);
    return layer;
  }
  /** World constructs next layers without registering their names yet. */
  createFieldLayers(field: Field) {
    if (this.fieldLayers.has(field)) return;
    this.fieldLayers.set(field, {
      top: this.createLayer('top', field),
      bottom: this.createLayer('bottom', field),
    });
  }
  layer(field: Field, kind: 'top' | 'bottom') {
    return this.fieldLayers.get(field)?.[kind];
  }
  register(layer: EffectLayer) {
    // _-8o appends; _-Z7 resolves the first matching name.
    this.registered.push(layer);
  }
  unregister(name: EffectLayerName) {
    const index = this.registered.findIndex((layer) => layer.kind === name);
    if (index >= 0) this.registered.splice(index, 1);
  }
  resolve(name: EffectLayerName) {
    return this.registered.find((layer) => layer.kind === name);
  }
  detachLayer(layer: EffectLayer) {
    this.attached.delete(layer);
  }
  layerAttached(layer: EffectLayer) {
    return this.attached.has(layer);
  }
  parent(clip: EffectClip) {
    return this.parents.get(clip);
  }
  *owned(layer: EffectLayer): IterableIterator<EffectClip> {
    yield* this.members.get(layer) ?? [];
  }
  /** Source CreateEffect writes captured Number arguments onto the original display object. */
  createRequest(request: EffectRequest, context: Field, random: () => number) {
    const { clip, x, y, name, randomRotation, callback } = request;
    if (randomRotation) clip.rotation = Math.round(random() * 360);
    clip.x = displayPixel(x);
    clip.y = displayPixel(y);
    this.create(clip, name, context, callback);
  }
  /** Physical addChild/record seam, with no constructor or placement discovery. */
  create(clip: EffectClip, name: EffectLayerName, context: Field, callback?: () => void) {
    const layer = this.resolve(name);
    if (!layer) throw new EffectLayerReadError(`No registered ${name} layer`);
    const previous = this.parents.get(clip);
    if (previous) this.members.get(previous)!.delete(clip);
    this.parents.set(clip, layer);
    this.members.get(layer)!.add(clip);
    this.completions.push({ clip, name, context, callback });
  }
  effectsFor(field: Field): readonly Effect[] {
    return [
      ...new Set(
        this.completions
          .filter(
            (entry) =>
              entry.context === field && isArtwork(entry.clip) && this.parents.has(entry.clip),
          )
          .map((entry) => entry.clip as Effect),
      ),
    ];
  }
  pendingFor(field: Field): readonly PendingEffect[] {
    return this.completions
      .filter((entry) => entry.context === field && !isArtwork(entry.clip))
      .map((entry) => entry.clip as PendingEffect);
  }
  /** Stage clocks are host-owned; registration/queries never advance them. */
  advanceArtwork() {
    this.artwork.exitFrame();
    const advanced = new Set<EffectClip>();
    for (const { clip } of this.completions) {
      const parent = this.parents.get(clip);
      if (!parent || !this.attached.has(parent) || advanced.has(clip)) continue;
      advanced.add(clip);
      if (isArtwork(clip) && !clip.playback) clip.age++;
    }
  }
  poll() {
    // Run collects every completed identity before invoking any callback.
    const ready = this.completions
      .filter(({ clip }) =>
        isArtwork(clip)
          ? clip.playback
            ? clip.playback.currentFrame >= clip.playback.totalFrames
            : (clip.frame ?? (clip.age % clip.duration) + 1) >= clip.duration
          : clip.frame >= clip.total,
      )
      .map(({ clip }) => clip);
    for (const clip of ready) this.complete(clip);
  }
  private removeFromResolvedLayer(entry: Completion) {
    const layer = this.resolve(entry.name);
    if (!layer) throw new EffectLayerReadError(`No registered ${entry.name} layer`);
    if (this.parents.get(entry.clip) !== layer)
      throw new EffectChildRemovalError('Effect is not a child of the resolved layer');
    this.members.get(layer)!.delete(entry.clip);
    this.parents.delete(entry.clip);
  }
  private complete(clip: EffectClip) {
    const index = this.completions.findIndex((entry) => entry.clip === clip);
    if (index < 0) return;
    this.completions[index].callback?.();
    // _-9p rereads the indexed record after callback mutation, rather than
    // retaining an entry or splicing a replacement array over newborn effects.
    const entry = this.completions[index];
    if (!entry) throw new EffectCompletionReadError('Completion record disappeared in callback');
    this.removeFromResolvedLayer(entry);
    this.completions.splice(index, 1);
  }
  /** Explicit removal by the host controller, without completing a callback. */
  discard(clip: EffectClip) {
    const parent = this.parents.get(clip);
    if (parent) this.members.get(parent)!.delete(clip);
    this.parents.delete(clip);
    this.completions = this.completions.filter((entry) => entry.clip !== clip);
  }
  /** _-8Y removes registered records without calling their completions. */
  clear() {
    for (const entry of this.completions) this.removeFromResolvedLayer(entry);
    this.completions.length = 0;
  }
}
