import type { Tank } from './types';

/** An existing numeric playback owner; ticking must not discover/create mounts. */
export interface ActorArtworkPlayback {
  advanceArtwork(tank: Tank): void;
}

// Neither this bridge nor a World clock keeps an AssetPack/actor alive. The pack's
// WeakMap owns the playback while the actual actor and pack remain reachable.
const playbacks = new WeakMap<Tank, Set<WeakRef<ActorArtworkPlayback>>>();

export function observeActorArtwork(tank: Tank, playback: ActorArtworkPlayback) {
  let observers = playbacks.get(tank);
  if (!observers) playbacks.set(tank, (observers = new Set()));
  observers.add(new WeakRef(playback));
}

export function advanceActorPlayback(tank: Tank) {
  const observers = playbacks.get(tank);
  if (!observers) return;
  for (const reference of observers) {
    const playback = reference.deref();
    if (playback) playback.advanceArtwork(tank);
    else observers.delete(reference);
  }
}
