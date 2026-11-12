import { MainEffects } from '../simulation/main-effects';
import { StageCapture } from './stage-capture';
import { MainBackground } from '../core/main-background';

interface StageListener {
  elapsed?: (milliseconds: number) => void;
  beforeStep?: () => void;
  /** Main.Run's selected menu/world branch, before the background recipients. */
  mainStep?: () => void;
  step?: () => void;
  draw?: () => void;
}

/** One browser stage clock, including menus and a paused/absent game world. */
export class StageRuntime {
  constructor(readonly effects = new MainEffects()) {}
  random: () => number = Math.random;
  readonly background = new MainBackground(() => this.random());
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
      // The AVM2 broadcast fixes its recipient range before any listener runs.
      // New views can draw now, but begin frame callbacks in the next cohort.
      const frameListeners = [...this.listeners];
      // Main registers sEffects.Run before Main.Run: existing effects age first.
      this.effects.tick(this.random);
      for (const listener of frameListeners)
        if (this.listeners.has(listener)) listener.beforeStep?.();
      for (const listener of frameListeners)
        if (this.listeners.has(listener)) listener.mainStep?.();
      // Apply camera shifts after Main/world updates in the shared clock.
      this.background.advance();
      // Later-created child menus run after the retained background recipients.
      for (const listener of frameListeners) if (this.listeners.has(listener)) listener.step?.();
      this.accumulator = Math.max(0, this.accumulator - step);
    }
    // Render currently attached views, including those created during the last step.
    for (const listener of this.listeners) listener.draw?.();
  }
}
