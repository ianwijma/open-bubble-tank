import type { StatusDecoration, Tank } from '../core/types';
import { Random } from '../core/math';
import { STATUS_ART } from '../data/status-art';
import { SwfClip, type ClipSource } from './swf-clip';

/** EffectMeCrazy holds only the root frame; descendants retain their own clocks. */
export class StatusPlayback {
  private states = new WeakMap<StatusDecoration, SwfClip[]>();
  constructor(private source: ClipSource) {}
  clip(tank: Tank, index: number) {
    const decoration = tank.statusDecoration!;
    let clips = this.states.get(decoration);
    if (!clips) {
      clips = decoration.marks.map((mark, i) => {
        const random = new Random((Math.imul(tank.uid + 1, 0x9e3779b1) ^ i ^ 0x51a7) >>> 0 || 1),
          clip = new SwfClip(STATUS_ART[decoration.kind], this.source, () => random.next());
        clip.start(mark.frame, decoration.kind === 'stun', mark.y);
        return clip;
      });
      this.states.set(decoration, clips);
    }
    const clip = clips[index];
    clip.advance(decoration.artAge + 1, decoration.marks[index].y);
    return clip;
  }
}
