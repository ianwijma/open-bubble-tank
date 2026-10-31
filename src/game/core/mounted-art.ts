import type { GunState } from './types';

/** _-YM.PartCallTrigger resumes720; frame1 stops again after its27-frame loop. */
export function triggerMassiveCharge(gun: GunState, artAge: number) {
  const age = artAge + 1;
  // play() during playback does not restart it. Only720's leaf-only episode can
  // be coalesced this way: it has one stop, no randomness, and no child scripts.
  if (gun.mountedPlay && age < gun.mountedPlay.age + gun.mountedPlay.frames) return;
  gun.mountedPlay = { child: 'bullet_mc', age, frames: 27 };
}

export function massiveChargeFrame(gun: GunState | undefined, artAge: number) {
  const play = gun?.mountedPlay,
    elapsed = play ? artAge + 1 - play.age : -1;
  return play && elapsed >= 0 && elapsed < play.frames ? elapsed + 1 : 1;
}
