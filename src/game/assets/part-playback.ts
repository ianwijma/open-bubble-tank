import type { GunState, Tank, TankDesign, TankPart } from '../core/types';
import type { SwfClip } from './swf-clip';
import { readActorArtworkPhase, type ActorArtworkPhase } from '../core/actor-artwork';

/** Lazy mounted playback shared by painting/contact, with no simulation writes. */
export class PartPlayback {
  private appliedAge = -1;
  constructor(readonly clip: SwfClip) {}
  /** Lazy host catch-up remains a boundary; already materialized mounts need no reads.
   * Previous scripts precede the next entry, current scripts wait until after Main.
   */
  present(state: ActorArtworkPhase, y: number, play?: GunState['mountedPlay']) {
    this.clip.construct();
    const applyPlay = () => {
      if (
        play &&
        (play.artworkFrame ?? play.age) <= this.clip.age &&
        play.age !== this.appliedAge
      ) {
        for (const child of this.clip.children.values())
          if (child.placement.name === play.child) child.clip.play();
        this.appliedAge = play.age;
      }
    };
    while (this.clip.age < state.frame) {
      if (this.clip.age) {
        this.clip.runFrameScripts(y);
        applyPlay();
      }
      this.clip.enterFrame();
    }
    if (state.phase === 'exit') {
      this.clip.runFrameScripts(y);
      applyPlay();
    }
    return this.clip;
  }
  advance(age: number, y: number, play?: GunState['mountedPlay']) {
    if (play && play.age <= age && play.age !== this.appliedAge) {
      // Materialize the stopped constructor pose before play(), then catch up.
      // Advancing directly to the render age first would lose skipped frames.
      this.clip.advance(play.age, y);
      for (const child of this.clip.children.values())
        if (child.placement.name === play.child) child.clip.play();
      this.appliedAge = play.age;
    }
    this.clip.advance(age, y);
    return this.clip;
  }
}

/** Only already materialized mounts. No display/Run membership or constructor fallback. */
export class MountedParts {
  readonly parts = new Map<string, { part: TankPart; playback: PartPlayback }>();
  constructor(readonly design: TankDesign) {}
  enterFrame(tank: Tank) {
    this.advanceArtwork(tank);
  }
  advanceArtwork(tank: Tank) {
    const state = readActorArtworkPhase(tank);
    for (const { part, playback } of this.parts.values()) {
      const play = tank.guns.find((gun) => gun.part.key === part.key)?.mountedPlay;
      if (state) playback.present(state, part.y, play);
      else playback.advance(tank.artAge + 1, part.y, play);
    }
  }
}
