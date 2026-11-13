import type { DisplayPlacement } from './asset-pack';
import { ClipTimeline, type FrameAction } from './clip-timeline';
import scripts from '../data/timeline-scripts.json';
const actions = scripts as Record<number, Record<number, FrameAction>>;

export interface ClipSource {
  spriteInfo(id: number): { frameCount: number } | undefined;
  displayList(id: number, age: number): DisplayPlacement[];
}
export interface ClipLine {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly color: number;
  readonly alpha: number;
}

export interface ClipChild {
  placement: DisplayPlacement;
  clip: SwfClip;
  born: number;
}

/** A retained MovieClip tree shared by painting and geometric contact; no DOM or Pixi dependency. */
export class SwfClip {
  age = 0;
  revision = 0;
  /** Numeric graphics owned by this exact child, never by its parent request. */
  lines: readonly ClipLine[] = [];
  placements: DisplayPlacement[] = [];
  /** Last actual authored own placement survives timeline removal. Root placement is host-owned. */
  placement?: DisplayPlacement;
  parent: SwfClip | null = null;
  readonly children = new Map<number, ClipChild>();
  private timeline: ClipTimeline | null;
  private scriptsPending = false;
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
  /** Explicit numeric drawing mutations invalidate ancestor paint caches without advancing. */
  invalidate() {
    this.revision++;
    this.parent?.invalidate();
  }
  get frame() {
    return this.timeline?.frame ?? 1;
  }
  /** Authored construction poses exist before the first registered frame script. */
  construct() {
    if (!this.age && this.timeline) this.sync(true);
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
      this.enterFrame();
      this.runFrameScripts(y);
    }
  }
  /** Retained stage phase API; ordinary advance() retains its combined behavior. */
  enterFrame() {
    if (!this.timeline) {
      this.age++;
      return;
    }
    const previous = this.frame;
    this.advanceChildren();
    this.age++;
    this.timeline.enterFrame();
    // A stopped/single-frame parent has no new tags. Its children already entered
    // independently, and propagated any newly pending script to this instance.
    if (this.age === 1 || this.frame !== previous) this.sync(false, true);
    else if (this.timeline.hasPendingScript) this.markScriptsPending();
  }
  runFrameScripts(y = 0) {
    if (!this.timeline || !this.scriptsPending) return;
    const previous = this.frame;
    this.timeline.runFrameScripts(y);
    // Entry already applied this frame's placements. Only a script jump changes them.
    if (this.frame !== previous) this.sync(false, true);
    for (const placement of this.placements) {
      const child = this.children.get(placement.depth)!;
      if (child.clip.scriptsPending) child.clip.runFrameScripts(child.placement.matrix.ty / 20);
    }
    this.scriptsPending = false;
  }
  gotoAndPlay(frame: number, y = 0) {
    if (!this.timeline) return;
    this.timeline.goto(frame, true, y);
    this.sync();
  }
  play() {
    this.timeline?.play();
  }
  gotoAndStop(frame: number, y = 0) {
    if (!this.timeline) return;
    this.timeline.goto(frame, false, y);
    this.sync();
  }
  /** Existing render children enter in reverse depth order BEFORE parent tags/removals.
   * Removed timeline descendants receive this final entry, then cease participating.
   * Engine removal of an independently owned root is a separate lifetime boundary.
   */
  private advanceChildren() {
    for (let index = this.placements.length - 1; index >= 0; index--) {
      const child = this.children.get(this.placements[index].depth)!;
      const target = this.age - child.born + 2;
      while (child.clip.age < target) child.clip.enterFrame();
    }
  }
  private markScriptsPending() {
    this.scriptsPending = true;
    this.parent?.markScriptsPending();
  }
  private sync(constructing = false, staged = false) {
    const placements = this.source.displayList(this.id, this.frame),
      active = new Set(placements.map((p) => p.depth));
    this.placements = placements;
    let pending = this.timeline?.hasPendingScript ?? false;
    for (const [depth, child] of this.children)
      if (!active.has(depth)) {
        child.clip.parent = null;
        this.children.delete(depth);
      }
    for (const placement of placements) {
      let child = this.children.get(placement.depth);
      if (
        !child ||
        child.clip.id !== placement.charId ||
        child.placement.bornFrame !== placement.bornFrame
      ) {
        if (child) child.clip.parent = null;
        child = {
          placement,
          clip: new SwfClip(placement.charId, this.source, this.random, this.depth + 1),
          born: Math.max(1, this.age),
        };
        this.children.set(placement.depth, child);
      }
      child.placement = placement;
      child.clip.placement = placement;
      child.clip.parent = this;
      if (constructing) child.clip.construct();
      else if (staged) {
        while (child.clip.age < this.age - child.born + 1) child.clip.enterFrame();
      } else if (child.clip.age < Math.max(1, this.age - child.born + 1))
        child.clip.advance(this.age - child.born + 1, placement.matrix.ty / 20);
      pending ||= child.clip.scriptsPending;
    }
    this.scriptsPending = pending;
    if (pending) this.parent?.markScriptsPending();
  }
}
