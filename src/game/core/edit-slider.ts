import { HUD } from './hud';
import type { MapMode } from './minimap';

/** AvatarInterface's event-triggered edit slider. Layout changes only when the source repositions it. */
export class EditSliderState {
  x = HUD.edit.x;
  y = HUD.edit.y;
  mapMode: MapMode = 3;
  tween: -1 | 1 | 2 = -1;
  enabled = false;
  hovered = false;
  private distance = 0;
  private speed = 40;
  private moveX = 0;
  get layout() {
    return HUD.edit.modes[this.mapMode - 1];
  }
  get atRest() {
    return this.x > 22 && this.x < 26;
  }
  private get hiddenX() {
    return -(this.layout.bounds.width + 10);
  }
  trigger(level: number, mode: MapMode) {
    if (level < 1) return;
    this.mapMode = mode;
    this.y = this.layout.y;
    this.x = this.hiddenX;
    this.speed = this.layout.speed;
    this.distance = Math.abs(24 - this.x);
    this.tween = 1;
    this.enabled = true;
  }
  reflow(mode: MapMode) {
    if (!this.atRest) return;
    this.mapMode = mode;
    this.y = this.layout.y;
    this.x = 24;
    // _-BV deliberately leaves the last TriggerEditButton speed unchanged.
  }
  hide() {
    this.enabled = false;
    this.hovered = false;
    this.distance = Math.abs(this.hiddenX - this.x);
    this.tween = 2;
  }
  advance() {
    if (this.tween === -1) return;
    const incoming = this.tween === 1;
    const target = incoming ? 24 : this.hiddenX;
    const speed = this.distance ? (this.speed * Math.abs(target - this.x)) / this.distance : 0;
    if (speed < 0.2) {
      this.x = target;
      this.tween = -1;
      // _-H5 still applies the preceding movement after SetMovement snaps/stops the tween.
    } else this.moveX = speed;
    this.x += incoming ? this.moveX : -this.moveX;
  }
}
