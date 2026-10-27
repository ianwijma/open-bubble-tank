import type { Vec } from '../core/types';

export interface MainFlash {
  color: number;
  fillAlpha: number;
  alpha: number;
}
// DisplayObject stores coordinates as twips and alpha as an 8.8 color transform.
const pixels = (value: number) => Math.trunc(value * 20) / 20 || 0;
const alpha = (value: number) => Math.trunc(value * 256) / 256 || 0;

/** _-1w: Main ENTER_FRAME effects, independent of the world and its camera. */
export class MainEffects {
  position: Vec = { x: 0, y: 0 };
  flashes: MainFlash[] = [];
  enabled = true;
  remaining = 0;
  private baseline: Vec = { x: 0, y: 0 };
  private start = 0;
  private counter = 0;

  shake(frames: number) {
    if (!this.enabled || this.remaining !== 0) return;
    this.remaining = this.start = frames;
    this.counter = 3;
    this.baseline = { ...this.position };
  }
  flash(color = 0xffffff, fillAlpha = 1) {
    const flash = { color: color >>> 0, fillAlpha, alpha: 1 };
    this.flashes.push(flash);
    return flash;
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.resetPosition();
  }
  private resetPosition() {
    if (this.position.x === this.baseline.x && this.position.y === this.baseline.y) return;
    this.remaining = 0;
    // Pcode confirms the source passes baseline, not its computed reset delta, to _-bS.
    const x = this.baseline.x,
      y = this.baseline.y;
    this.baseline.x = Math.round(x);
    this.baseline.y = Math.round(y);
    this.position = {
      x: pixels(pixels(x) + this.baseline.x),
      y: pixels(pixels(y) + this.baseline.y),
    };
  }
  tick(random: () => number) {
    if (this.remaining > 0) {
      this.remaining--;
      if (this.remaining === 0) this.resetPosition();
      else if (--this.counter === 0) {
        this.counter = 3;
        const amplitude = this.start > 45 ? 4 : 2,
          fraction = this.remaining / this.start;
        const roll = () => Math.round(random() * (amplitude * 2 + 0.8) - amplitude - 0.4);
        const x = this.baseline.x + roll() * fraction,
          y = this.baseline.y + roll() * fraction;
        // _-D9 assigns the candidate before _-bS adds the rounded delta a second time.
        this.position = {
          x: pixels(pixels(x) + Math.round(x - this.position.x)),
          y: pixels(pixels(y) + Math.round(y - this.position.y)),
        };
      }
    }
    for (let i = 0; i < this.flashes.length; i++) {
      const flash = this.flashes[i];
      if (flash.alpha <= 0) this.flashes.splice(i--, 1);
      else flash.alpha = alpha(flash.alpha - 0.05);
    }
  }
}
