export interface ViewerFadeState {
  alpha: number;
  mouseEnabled: boolean;
}
/** TankViewerScreen._-KT/_-Lv/Update, including forward-splice queue ordering. */
export class ViewerFades {
  private states = new Map<string, ViewerFadeState>();
  private incoming: string[] = [];
  private outgoing: string[] = [];
  private deleting: string[] = [];
  private disposers = new Map<string, () => void>();
  private listeners = new Set<() => void>();
  state(name: string, alpha = 0) {
    let state = this.states.get(name);
    if (!state) {
      state = { alpha, mouseEnabled: alpha > 0 };
      this.states.set(name, state);
    }
    return state;
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private detach(name: string) {
    for (const queue of [this.incoming, this.outgoing]) {
      const index = queue.indexOf(name);
      if (index !== -1) queue.splice(index, 1);
    }
    const index = this.deleting.indexOf(name);
    if (index !== -1) {
      this.disposers.get(name)?.();
      this.deleting.splice(index, 1);
    }
  }
  onDelete(name: string, dispose: () => void) {
    this.disposers.set(name, dispose);
  }
  cancel(name: string) {
    this.detach(name);
    this.changed();
  }
  deleteAfterFade(name: string) {
    this.detach(name);
    this.deleting.push(name);
    this.changed();
  }
  show(name: string, reset = false) {
    this.detach(name);
    const state = this.state(name);
    if (reset) state.alpha = 0;
    state.mouseEnabled = true;
    this.incoming.push(name);
    this.changed();
  }
  hide(name: string) {
    this.detach(name);
    this.state(name).mouseEnabled = false;
    this.outgoing.push(name);
    this.changed();
  }
  step() {
    for (let i = 0; i < this.incoming.length; i++) {
      const state = this.state(this.incoming[i]);
      state.mouseEnabled = true;
      if (state.alpha < 1) state.alpha = Math.min(1, state.alpha + 0.2);
      else this.incoming.splice(i, 1);
    }
    for (let i = 0; i < this.outgoing.length; i++) {
      const state = this.state(this.outgoing[i]);
      state.mouseEnabled = false;
      if (state.alpha > 0) state.alpha = Math.max(0, state.alpha - 0.2);
      else this.outgoing.splice(i, 1);
    }
    for (let i = 0; i < this.deleting.length; i++) {
      const name = this.deleting[i],
        state = this.state(name);
      if (state.alpha > 0) state.alpha = Math.max(0, state.alpha - 0.2);
      else {
        this.disposers.get(name)?.();
        this.deleting.splice(i, 1);
      }
    }
    this.changed();
  }
  settled(name: string) {
    return (
      !this.incoming.includes(name) &&
      !this.outgoing.includes(name) &&
      !this.deleting.includes(name)
    );
  }
  private changed() {
    for (const listener of this.listeners) listener();
  }
}
