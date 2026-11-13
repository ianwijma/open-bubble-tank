import type { Tank } from '../core/types';
import { advanceActorPlayback } from '../core/actor-artwork';
import { advanceTankArt } from './tank-art';

/** World-owned constructions/references, independent of parentage and gameplay Run.
 * Weak registrations permit otherwise unreachable actors to be collected. They do
 * not model Flash GC or keep every historical actor alive for its artwork clock.
 */
export class ActorArtwork {
  private registered = new WeakSet<Tank>();
  private references = new Set<WeakRef<Tank>>();
  private cohort?: WeakRef<Tank>[];

  /** Constructor registration is idempotent; addChild/cache restore is not birth. */
  construct(tank: Tank) {
    if (this.registered.has(tank)) return;
    this.registered.add(tank);
    this.references.add(new WeakRef(tank));
  }

  /** Main's selected ENTER cohort excludes actors constructed inside that listener. */
  enterFrame() {
    this.cohort = [];
    for (const reference of this.references) {
      if (reference.deref()) this.cohort.push(reference);
      else this.references.delete(reference);
    }
  }

  advanceArtwork() {
    const cohort = this.cohort ?? [];
    this.cohort = undefined;
    for (const reference of cohort) {
      const tank = reference.deref();
      if (!tank) continue;
      advanceTankArt(tank);
      advanceActorPlayback(tank);
    }
  }
}
