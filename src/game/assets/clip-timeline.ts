export interface RoundedRandom {
  scale: number;
  offsets: number[];
}
export type FrameAction =
  | { type: 'stop' }
  | { type: 'jump'; frame: number; playing: boolean }
  | { type: 'random-jump'; random: RoundedRandom }
  | { type: 'random-branch'; random: RoundedRandom; targets: Record<string, number> }
  | { type: 'y-branch'; positive: number; nonPositive?: number };

/** The recovered MovieClip actions, independent of rendering and wall-clock time. */
export class ClipTimeline {
  frame = 1;
  playing = true;
  private started = false;
  constructor(
    private count: number,
    private actions: Readonly<Record<number, FrameAction>> = {},
    private random: () => number = Math.random,
  ) {}
  tick(y = 0) {
    if (!this.started) {
      this.started = true;
      this.run(y);
    } else if (this.playing && this.count > 1) {
      this.frame = (this.frame % this.count) + 1;
      this.run(y);
    }
    return this.frame;
  }
  goto(frame: number, playing: boolean, y = 0) {
    const target = this.clamp(frame),
      changed = target !== this.frame;
    this.frame = target;
    this.playing = playing;
    if (changed || !this.started) {
      this.started = true;
      this.run(y);
    }
    return this.frame;
  }
  private clamp(frame: number) {
    return Math.max(1, Math.min(this.count, Math.floor(frame)));
  }
  private rounded(spec: RoundedRandom) {
    let value = this.random() * spec.scale;
    for (const offset of spec.offsets) value += offset;
    return Math.round(value);
  }
  private run(y: number) {
    // A self-targeting goto does not recursively rerun the current frame script.
    const visited = new Set<number>();
    while (!visited.has(this.frame)) {
      visited.add(this.frame);
      const action = this.actions[this.frame];
      if (!action) return;
      let target: number | undefined;
      switch (action.type) {
        case 'stop':
          this.playing = false;
          return;
        case 'jump':
          this.playing = action.playing;
          target = action.frame;
          break;
        case 'random-jump':
          this.playing = true;
          target = this.rounded(action.random);
          break;
        case 'random-branch':
          target = action.targets[this.rounded(action.random)];
          if (target !== undefined) this.playing = true;
          break;
        case 'y-branch':
          target = y > 0 ? action.positive : action.nonPositive;
          if (target !== undefined) this.playing = true;
          break;
      }
      if (target === undefined) return;
      this.frame = this.clamp(target);
    }
  }
}
