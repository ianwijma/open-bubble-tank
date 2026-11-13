import type { Tank } from '../core/types';
import { advanceActorPlayback, setActorArtworkPhase } from '../core/actor-artwork';
import { advanceTankArt } from './tank-art';

/** Explicit weak construction ownership, independent of attachment/Run/paint arrays. */
export class ActorArtwork {
  private registered = new WeakMap<Tank, { born: number; frame: number }>();
  private references = new Set<WeakRef<Tank>>();
  private cohort?: WeakRef<Tank>[];
  private epoch = 0;

  construct(tank: Tank) {
    if (this.registered.has(tank)) return;
    this.registered.set(tank, { born: this.epoch, frame: 0 });
    this.references.add(new WeakRef(tank));
    setActorArtworkPhase(tank, { frame: 0, phase: 'constructor' });
  }
  /** Timelines enter BEFORE Main reads geometry/paint or writes mounted placement. */
  enterFrame() {
    this.epoch++;
    this.cohort = [];
    for (const reference of this.references) {
      const tank = reference.deref();
      if (!tank) {
        this.references.delete(reference);
        continue;
      }
      this.cohort.push(reference);
      const clock = this.registered.get(tank)!;
      if (!clock.frame || this.epoch >= clock.born + 2) clock.frame++;
      setActorArtworkPhase(tank, { frame: clock.frame, phase: 'enter' });
      advanceActorPlayback(tank, true);
    }
  }
  advanceArtwork() {
    // Compatibility/status clocks retain their existing policy; they are not the
    // mounted root's clock. Inside-Main births are initialized below before EXIT.
    for (const reference of this.cohort ?? []) {
      const tank = reference.deref();
      if (tank) advanceTankArt(tank);
    }
    this.cohort = undefined;
    for (const reference of this.references) {
      const tank = reference.deref();
      if (!tank) {
        this.references.delete(reference);
        continue;
      }
      const clock = this.registered.get(tank)!;
      if (!clock.frame) clock.frame = 1;
      setActorArtworkPhase(tank, { frame: clock.frame, phase: 'exit' });
      advanceActorPlayback(tank);
    }
  }
}
