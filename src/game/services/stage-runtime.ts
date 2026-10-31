import { MainEffects } from '../simulation/main-effects';
import { StageCapture } from './stage-capture';

interface StageListener {
  elapsed?: (milliseconds: number) => void;
  beforeStep?: () => void;
  step?: () => void;
  draw?: () => void;
}

/** One browser stage clock, including menus and a paused/absent game world. */
export class StageRuntime {
  constructor(readonly effects = new MainEffects()) {}
  random: () => number = Math.random;
  readonly capture = new StageCapture();
  private accumulator = 0;
  private listeners = new Set<StageListener>();
  subscribe(listener: StageListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  advance(milliseconds: number, fps: number) {
    const elapsed = Math.max(0, milliseconds);
    for (const listener of this.listeners) listener.elapsed?.(elapsed);
    this.accumulator += Math.min(elapsed, 100);
    const step = 1000 / fps;
    while (this.accumulator + 1e-8 >= step) {
      // Main registers sEffects.Run before Main.Run: existing effects age first.
      this.effects.tick(this.random);
      for (const listener of this.listeners) listener.beforeStep?.();
      for (const listener of this.listeners) listener.step?.();
      this.accumulator = Math.max(0, this.accumulator - step);
    }
    for (const listener of this.listeners) listener.draw?.();
  }
}
