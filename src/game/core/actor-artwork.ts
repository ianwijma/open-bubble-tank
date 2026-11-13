import type { Tank } from './types';

/** A host-owned stage pose, separate from compatibility artAge and gameplay Run. */
export interface ActorArtworkPhase {
  readonly frame: number;
  readonly phase: 'constructor' | 'enter' | 'exit';
}
/** Existing numeric playback only; neither phase discovers or constructs mounts. */
export interface ActorArtworkPlayback {
  enterFrame(tank: Tank): void;
  advanceArtwork(tank: Tank): void;
}
const phases = new WeakMap<Tank, ActorArtworkPhase>();
export function readActorArtworkPhase(tank: Tank) {
  return phases.get(tank);
}
export function setActorArtworkPhase(tank: Tank, state: ActorArtworkPhase) {
  phases.set(tank, state);
}
// The AssetPack WeakMap owns playback records; this bridge never roots a pack/actor.
const playbacks = new WeakMap<Tank, Set<WeakRef<ActorArtworkPlayback>>>();
export function observeActorArtwork(tank: Tank, playback: ActorArtworkPlayback) {
  let observers = playbacks.get(tank);
  if (!observers) playbacks.set(tank, (observers = new Set()));
  observers.add(new WeakRef(playback));
}
export function advanceActorPlayback(tank: Tank, entering = false) {
  const observers = playbacks.get(tank);
  if (!observers) return;
  for (const reference of observers) {
    const playback = reference.deref();
    if (playback) {
      if (entering) playback.enterFrame(tank);
      else playback.advanceArtwork(tank);
    } else observers.delete(reference);
  }
}
