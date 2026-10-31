import { TANK_VIEWER } from './tank-viewer';

export interface ViewerRejection {
  id: string;
  message: string;
}
/** _-2c.CreateEffect/Run: independent MovieClip lifetimes, removed at their final frame. */
export class ViewerRejections {
  private serial = 0;
  private snapshot: readonly ViewerRejection[] = [];
  private frames = new Map<string, number>();
  private listeners = new Set<() => void>();
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  add(message: string) {
    const id = `rejection:${++this.serial}`;
    this.frames.set(id, 1);
    this.snapshot = [...this.snapshot, { id, message }];
    this.changed();
    return id;
  }
  frame(id: string) {
    return this.frames.get(id);
  }
  step() {
    let removed = false;
    for (const [id, frame] of this.frames) {
      if (frame + 1 >= TANK_VIEWER.rejection.frameCount) {
        this.frames.delete(id);
        removed = true;
      } else this.frames.set(id, frame + 1);
    }
    if (removed) {
      this.snapshot = this.snapshot.filter((entry) => this.frames.has(entry.id));
      this.changed();
    }
  }
  private changed() {
    for (const listener of this.listeners) listener();
  }
}
