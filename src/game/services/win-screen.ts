import { PauseBitmapHistory, straightBitmap } from '../core/bitmap-blur';
import { WinScreenState } from '../core/win-screen';
import type { StageRuntime } from './stage-runtime';

export type WinAction = 'continue' | 'menu';

/** Attached under World before Setup draws Main; never changes Main to mode4. */
export class WinScreen {
  readonly motion = new WinScreenState();
  history: PauseBitmapHistory | undefined;
  captureCount = 0;
  private observers = new Set<() => void>();
  private unsubscribe: () => void;
  private releaseCapture: () => void;
  private surface: HTMLCanvasElement | undefined;
  private paintedAge = -1;
  private disposed = false;

  constructor(
    readonly stage: StageRuntime,
    private readonly drawShade: (context: CanvasRenderingContext2D) => void,
    private readonly onAction: (action: WinAction) => void,
  ) {
    // Root depth1 shade, depth2 transparent foreground, then transparent bitmap layer.
    // World is order0; Main's independent flashes remain above the new child at10.
    this.releaseCapture = stage.capture.register({
      order: 1,
      draw: (context) => this.drawBackdrop(context),
    });
    try {
      const capture = stage.capture.capture({ refresh: true });
      if (capture) {
        this.history = new PauseBitmapHistory(550, 450, capture.data);
        this.captureCount = 1;
      }
    } catch (error) {
      this.releaseCapture();
      throw error;
    }
    this.unsubscribe = stage.subscribe({
      step: () => {
        this.motion.advance();
        // Saves the current bitmap BEFORE filtering, only at2,4,...,38.
        this.history?.advance(this.motion.age, false);
      },
      draw: () => {
        for (const observer of this.observers) observer();
      },
    });
  }

  get foregroundRaised() {
    return this.motion.age >= 40;
  }
  get active() {
    return !this.disposed;
  }
  observe(observer: () => void) {
    this.observers.add(observer);
    observer();
    return () => {
      this.observers.delete(observer);
    };
  }
  drawBackdrop(context: CanvasRenderingContext2D) {
    if (this.disposed) return;
    this.drawShade(context);
    if (!this.history) return; // Setup's capture sees a transparent working bitmap.
    const surface = (this.surface ??= document.createElement('canvas'));
    if (this.paintedAge !== this.motion.age) {
      surface.width = 550;
      surface.height = 450;
      const paint = surface.getContext('2d')!;
      const image = paint.createImageData(550, 450);
      straightBitmap(this.history.pixels, image.data);
      paint.putImageData(image, 0, 0);
      this.paintedAge = this.motion.age;
    }
    // The bitmap draw and the displayed transparent bitmap both use source-over.
    context.drawImage(surface, 0, 0);
  }
  complete(action: WinAction) {
    if (this.disposed) return;
    this.dispose(); // Mouse-up deactivates before invoking the World callback; no reversal.
    this.onAction(action);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.releaseCapture();
    this.history?.dispose();
    this.observers.clear();
    if (this.surface) this.surface.width = this.surface.height = 0;
    this.surface = undefined;
  }
}

/** Stand-in shade behind the win screen, painted synchronously during Setup. */
export function winShade() {
  return (context: CanvasRenderingContext2D) => {
    context.fillStyle = '#00000040';
    context.fillRect(0, 0, 550, 450);
  };
}
