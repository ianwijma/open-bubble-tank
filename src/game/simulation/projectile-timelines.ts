import { SwfClip } from '../assets/swf-clip';
import { buildDisplayList } from '../assets/display-list';
import type { DisplayPlacement, SpriteInfo } from '../assets/asset-pack';
import data from '../data/projectile-clips.json';
import mineArt from '../data/mine-art.json';
import type { Projectile } from '../core/types';
import { direction } from '../core/math';

const sprites = data.sprites as unknown as Record<number, SpriteInfo>;
const cache = new Map<string, DisplayPlacement[]>();
const source = {
  spriteInfo: (id: number) => sprites[id],
  displayList(id: number, age: number) {
    const sprite = sprites[id];
    if (!sprite) return [];
    const frame = ((Math.max(1, Math.floor(age)) - 1) % sprite.frameCount) + 1;
    const key = `${id}:${frame}`;
    let placements = cache.get(key);
    if (!placements) cache.set(key, (placements = buildDisplayList(sprite, frame)));
    return placements;
  },
};

/** Source-polled projectile MovieClips advance on the stage clock, including children. */
export class ProjectileTimelines {
  private clips = new WeakMap<Projectile, SwfClip>();
  constructor(private random: () => number) {}
  private root(b: Projectile) {
    switch (b.kind) {
      case 'mine':
        return b.enemy ? data.roots.enemyMine : data.roots.allyMine;
      case 'seekerMine':
        return data.roots.seekerMine;
      case 'grow':
        return data.roots.grow;
      case 'flak':
        return data.roots.flak;
      case 'whip':
        return data.roots.whip;
      case 'sapper':
        return data.roots.sapper;
    }
  }
  totalFrames(b: Projectile) {
    const id = this.root(b);
    return id === undefined ? 1 : sprites[id].frameCount;
  }
  initialize(b: Projectile) {
    const id = this.root(b);
    if (id === undefined) return;
    let clip = this.clips.get(b);
    if (!clip) {
      clip = new SwfClip(id, source, this.random);
      this.clips.set(b, clip);
      if (b.kind === 'grow') {
        // _-dO's constructor goto precedes frame-script polling. _-Wq is rounded.
        const frame = Math.round(this.random() * (this.totalFrames(b) - 1 + 0.8) + 1 - 0.4);
        clip.start(frame);
      } else clip.start(b.kind === 'sapper' ? 3 : 1, b.kind !== 'sapper');
      if (b.kind === 'seekerMine') {
        b.mineState ??= { armed: !!b.detonating, movement: direction(b.angle, b.speed) };
        if (b.mineState.armed) clip.gotoAndPlay(mineArt.seeker.labels.armed);
      }
      b.artPose = clip;
      b.artFrame = clip.frame;
    }
    return clip;
  }
  arm(b: Projectile) {
    const clip = this.initialize(b)!;
    b.mineState!.armed = true;
    b.detonating = 1;
    clip.gotoAndPlay(mineArt.seeker.labels.armed);
    b.artFrame = clip.frame;
  }
  hold(b: Projectile, frame: number) {
    const clip = this.initialize(b);
    if (!clip) return;
    clip.gotoAndStop(frame);
    b.artFrame = clip.frame;
  }
  advance(b: Projectile) {
    const clip = this.initialize(b);
    if (!clip) return;
    clip.advance(clip.age + 1);
    b.artFrame = clip.frame;
  }
}
