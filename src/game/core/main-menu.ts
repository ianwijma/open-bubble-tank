import { displayAlpha } from './display-values';
import geometry from '../data/main-menu-geometry.json';
import { MenuSeriesMotion } from './menu-series';

export const MAIN_MENU = geometry;

/** _-Sm: Setup, TitleCountdown, _-CL, _-Ze/_-2z and PlayButtonEffect. */
export class MainMenuMotion {
  readonly series = new MenuSeriesMotion();
  age = 0;
  parked = true;
  controlAlpha = 0;
  titleAlpha = 1;
  glowStrength = 0;
  private glowStep = 0.05;
  private titleCounter = 95;
  private direction: 'in' | 'out' = 'in';
  private delay = -1;
  get busy() {
    return this.delay >= 0;
  }
  open() {
    if (this.busy) return false;
    this.direction = 'out';
    this.delay = 30;
    return true;
  }
  back() {
    if (this.busy) return false;
    this.parked = false;
    this.direction = 'in';
    return true;
  }
  advance() {
    this.age++;
    this.series.advance(this.age + 1);
    if (this.titleCounter > 0) this.titleCounter--;
    else if (this.titleCounter === 0) {
      this.titleCounter = -1;
      this.parked = false;
      this.direction = 'in';
    }
    if (this.delay > 0) this.delay--;
    else if (this.delay === 0) {
      this.parked = true;
      this.delay = -1;
    }
    this.glowStrength += this.glowStep;
    if (this.glowStrength > 2 || this.glowStrength < 0) this.glowStep *= -1;
    const fade = (alpha: number) =>
      this.direction === 'in'
        ? alpha < 1
          ? displayAlpha(alpha + 0.05)
          : alpha
        : alpha > 0
          ? displayAlpha(alpha - 0.05)
          : alpha;
    this.controlAlpha = fade(this.controlAlpha);
    this.titleAlpha = fade(this.titleAlpha);
  }
}
