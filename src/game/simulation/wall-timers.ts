/** Flash Timer callbacks use elapsed milliseconds independently of stage/part Run. */
export class WallTimers {
  private now = 0;
  private timers: {
    owner: number;
    due: number;
    interval: number;
    count: number;
    tick: (index: number) => void;
    index: number;
  }[] = [];
  repeat(owner: number, interval: number, count: number, tick: (index: number) => void) {
    this.timers.push({ owner, due: this.now + interval, interval, count, tick, index: 0 });
  }
  cancel(owner: number) {
    this.timers = this.timers.filter((timer) => timer.owner !== owner);
  }
  advance(milliseconds: number) {
    const end = this.now + Math.max(0, milliseconds);
    // Deliver in chronological order, including interleaved timers after a slow render.
    while (true) {
      const next = this.timers.filter((timer) => timer.due <= end).sort((a, b) => a.due - b.due)[0];
      if (!next) break;
      this.now = next.due;
      next.tick(next.index++);
      next.count--;
      next.due += next.interval;
      if (!next.count) this.timers = this.timers.filter((timer) => timer !== next);
    }
    this.now = end;
  }
}
