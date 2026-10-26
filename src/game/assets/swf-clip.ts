import type { DisplayPlacement } from './asset-pack';
import { ClipTimeline, type FrameAction } from './clip-timeline';
import scripts from '../data/timeline-scripts.json';
const actions = scripts as Record<number, Record<number, FrameAction>>;

export interface ClipSource {
  spriteInfo(id: number): { frameCount: number } | undefined;
  displayList(id: number, age: number): DisplayPlacement[];
}
export interface ClipChild {
  placement: DisplayPlacement;
  clip: SwfClip;
  born: number;
}

/** A retained MovieClip tree shared by painting and pixel contact; no DOM or Pixi dependency. */
export class SwfClip {
  age = 0;
  placements: DisplayPlacement[] = [];
  readonly children = new Map<number, ClipChild>();
  private timeline: ClipTimeline | null;
  constructor(
    readonly id: number,
    private source: ClipSource,
    private random: () => number = Math.random,
    private depth = 0,
  ) {
    const sprite = source.spriteInfo(id);
    this.timeline =
      sprite && depth < 24 ? new ClipTimeline(sprite.frameCount, actions[id], random) : null;
  }
  get frame() {
    return this.timeline?.frame ?? 1;
  }
  /** Constructor goto takes effect before the first retained frame-script pose. */
  start(frame = 1, playing = true, y = 0) {
    if (this.age) return;
    this.age = 1;
    this.timeline?.goto(frame, playing, y);
    this.sync();
  }
  advance(age: number, y = 0) {
    const target = Math.max(1, Math.floor(age));
    if (!this.timeline) {
      this.age = target;
      return;
    }
    while (this.age < target) {
      this.age++;
      this.timeline.tick(y);
      this.sync();
    }
  }
  gotoAndPlay(frame: number, y = 0) {
    if (!this.timeline) return;
    this.timeline.goto(frame, true, y);
    this.sync();
  }
  gotoAndStop(frame: number, y = 0) {
    if (!this.timeline) return;
    this.timeline.goto(frame, false, y);
    this.sync();
  }
  private sync() {
    const placements = this.source.displayList(this.id, this.frame),
      active = new Set(placements.map((p) => p.depth));
    this.placements = placements;
    for (const depth of this.children.keys()) if (!active.has(depth)) this.children.delete(depth);
    for (const placement of placements) {
      let child = this.children.get(placement.depth);
      if (
        !child ||
        child.clip.id !== placement.charId ||
        child.placement.bornFrame !== placement.bornFrame
      ) {
        child = {
          placement,
          clip: new SwfClip(placement.charId, this.source, this.random, this.depth + 1),
          born: this.age,
        };
        this.children.set(placement.depth, child);
      }
      child.placement = placement;
      child.clip.advance(this.age - child.born + 1, placement.matrix.ty / 20);
    }
  }
}
