import type { DisplayPlacement, SpriteInfo } from '../assets/asset-pack';
import { buildDisplayList } from '../assets/display-list';
import { SwfClip, type ClipLine } from '../assets/swf-clip';
import type { Effect, Vec } from '../core/types';
import metadata from '../data/effect-clips.json';

const sprites = metadata.sprites as unknown as Record<number, SpriteInfo>;
const lists = new Map<string, DisplayPlacement[]>();
const source = {
  spriteInfo: (id: number) => sprites[id],
  displayList(id: number, frame: number) {
    if (!sprites[id]) return [];
    const key = `${id}:${frame}`;
    let list = lists.get(key);
    if (!list) lists.set(key, (list = buildDisplayList(sprites[id], frame)));
    return list;
  },
};

export interface RetainedEffectPlayback {
  readonly status: 'retained';
  readonly symbol: number;
  readonly className: string;
  readonly totalFrames: number;
  readonly sourceSha256: string;
  readonly pcodeSha256: string;
  readonly pose: SwfClip;
  /** The original constructor's named child reference, independent of later depths/names. */
  readonly lineTarget?: SwfClip;
  readonly currentFrame: number;
  readonly entropy: 'none-in-audited-graph';
}
export type EffectPlaybackRead =
  | RetainedEffectPlayback
  | Readonly<{ status: 'unsupported-native' | 'legacy-mock'; symbol?: number }>;

/** Pure read shared by renderer and future field geometry. No discovery/clock/entropy. */
export function readEffectPlayback(effect: Effect): EffectPlaybackRead {
  return (
    effect.playback ??
    Object.freeze({
      status: effect.kind === 'native' ? 'unsupported-native' : 'legacy-mock',
      symbol: effect.symbol,
    })
  );
}

interface Clock {
  pose: SwfClip;
  born: number;
  initialized: boolean;
  effect: Effect;
}

/** All15 audited plain constructors and their numeric descendants. No asset/browser services.
 * Stage roots remain independent of queue/engine/physical parents. Weak references avoid
 * rooting expired objects; a retained Effect or playback handle retains its clock.
 */
export class EffectPlayback {
  private cohort = 0;
  private clocks = new Set<WeakRef<Clock>>();
  private lifetimes = new WeakMap<SwfClip, Clock>();
  private *live() {
    for (const reference of this.clocks) {
      const clock = reference.deref();
      if (clock) yield clock;
      else this.clocks.delete(reference);
    }
  }
  construct(effect: Effect): RetainedEffectPlayback {
    if (effect.playback) return effect.playback;
    const root = metadata.roots.find((root) => root.symbol === effect.symbol);
    if (!root) throw new Error(`Unsupported native effect ${effect.symbol}`);
    const pose = new SwfClip(root.symbol, source, () => {
      throw new Error('Unexpected entropy in audited effect graph');
    });
    pose.construct();
    const line = pose.placements.find((placement) => placement.name === 'line_mc');
    const clock: Clock = { pose, effect, born: this.cohort, initialized: false };
    const playback: RetainedEffectPlayback = Object.freeze({
      status: 'retained',
      symbol: root.symbol,
      className: root.className,
      totalFrames: root.frameCount,
      sourceSha256: metadata.sourceSha256,
      pcodeSha256: root.pcodeSha256,
      pose,
      lineTarget: line ? pose.children.get(line.depth)!.clip : undefined,
      get currentFrame() {
        return clock.pose.frame;
      },
      entropy: 'none-in-audited-graph',
    });
    Object.defineProperties(effect, {
      playback: { enumerable: true, value: playback },
      frame: { enumerable: true, get: () => clock.pose.frame },
    });
    this.lifetimes.set(pose, clock);
    this.clocks.add(new WeakRef(clock));
    return playback;
  }
  /** Stage entry precedes Main/World.Run, including current-frame completion reads. */
  enterFrame() {
    this.cohort++;
    for (const clock of this.live()) {
      if (!clock.initialized) {
        clock.pose.enterFrame();
        clock.initialized = true;
      } else if (this.cohort >= clock.born + 2) clock.pose.enterFrame();
    }
  }
  /** Inside-ENTER births initialize before EXIT, holding1 through the next entry.
   * Every root constructor is plain; the existing2069 stop action runs normally.
   */
  exitFrame() {
    for (const clock of this.live()) {
      if (!clock.initialized) {
        clock.pose.enterFrame();
        clock.initialized = true;
      }
      clock.pose.runFrameScripts();
      clock.effect.age++;
    }
  }
}

/** Source graphics call targets the constructor's named child once; reads never redraw. */
export function drawEffectLine(effect: Effect, end: Vec) {
  const target = effect.playback?.lineTarget;
  if (!target) throw new Error('Effect has no retained line_mc');
  const line: ClipLine = Object.freeze({
    x: end.x,
    y: end.y,
    width: 2,
    color: 0xffffff,
    alpha: 0.3,
  });
  target.lines = Object.freeze([...target.lines, line]);
  target.invalidate();
}
