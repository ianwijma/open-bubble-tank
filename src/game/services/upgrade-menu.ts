import { UpgradeMenuMotion } from '../core/upgrade-motion';
import { PauseBitmapHistory } from '../core/bitmap-blur';
import type { StageRuntime } from './stage-runtime';

/** One browser-owned UpgradeMenu instance survives its creator/viewer children. */
export class UpgradeMenu {
  readonly motion = new UpgradeMenuMotion();
  history: PauseBitmapHistory | undefined;
  private observers = new Set<() => void>();
  private unsubscribe: () => void;
  private disposed = false;
  captureCount = 0;

  constructor(
    readonly stage: StageRuntime,
    private readonly onComplete: () => void,
  ) {
    const capture = stage.capture.capture();
    if (capture) {
      this.history = new PauseBitmapHistory(550, 450, capture.data);
      this.captureCount = 1;
    }
    this.unsubscribe = stage.subscribe({
      step: () => {
        const commands = this.motion.advance();
        this.history?.advance(this.motion.counter, this.motion.closing);
        if (commands.some((command) => command.type === 'finish')) this.complete();
      },
      draw: () => {
        for (const observer of this.observers) observer();
      },
    });
  }

  observe(observer: () => void) {
    this.observers.add(observer);
    observer();
    return () => {
      this.observers.delete(observer);
    };
  }

  /** Creator/search returns and confirmation No destroy directly, without a card fade. */
  complete() {
    if (this.disposed) return;
    this.dispose();
    this.onComplete();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.history?.dispose();
    this.observers.clear();
  }
}
