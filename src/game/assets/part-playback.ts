import type { GunState, Tank, TankDesign, TankPart } from '../core/types';
import type { SwfClip } from './swf-clip';

/** Lazy mounted playback shared by painting/contact, with no simulation writes. */
export class PartPlayback {
  private appliedAge = -1;
  constructor(readonly clip: SwfClip) {}
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
  advanceArtwork(tank: Tank) {
    for (const { part, playback } of this.parts.values())
      playback.advance(
        tank.artAge + 1,
        part.y,
        tank.guns.find((gun) => gun.part.key === part.key)?.mountedPlay,
      );
  }
}
