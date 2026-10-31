import { HUD } from './hud';
import { displayAlpha, displayPixel } from './display-values';

export const PAUSE = HUD.pause;
const exits: Record<string, keyof typeof PAUSE.out> = {
  btnSettings_mc: 'Button2Out_mc',
  btn3_mc: 'Button3Out_mc',
  btn5_mc: 'Button5Out_mc',
  btnPlayMoreGames_mc: 'Button6Out_mc',
};

/** PauseMenu._-1T/_-Af; all values advance in source stage frames. */
export class PauseMotion {
  phase: 'menu' | 'info' | 'closing' = 'menu';
  age = 0;
  blurFrame = 0;
  layerAlpha = 0;
  titleAlpha = 1;
  playAlpha = 1;
  hovered = '';
  finished = false;
  positions = Object.fromEntries(PAUSE.pieces.map((p) => [p.name, { x: p.x, y: p.y }]));
  scales = Object.fromEntries(PAUSE.pieces.map((p) => [p.name, p.scaleX]));
  constructor() {
    for (const [name, out] of Object.entries(exits)) this.positions[name] = { ...PAUSE.out[out] };
  }
  advance() {
    if (this.finished) return;
    this.age++;
    if (this.phase === 'closing') {
      if (this.blurFrame >= 0) this.blurFrame--;
      else {
        this.finished = true;
        return;
      }
      if (this.layerAlpha > 0) this.layerAlpha = displayAlpha(this.layerAlpha - 0.05);
    } else {
      if (this.blurFrame < 39) this.blurFrame++;
      if (this.phase === 'menu') {
        if (this.layerAlpha < 1) this.layerAlpha = displayAlpha(this.layerAlpha + 0.05);
        if (this.titleAlpha < 1) {
          this.titleAlpha = displayAlpha(this.titleAlpha + 0.1);
          this.playAlpha = displayAlpha(this.playAlpha + 0.1);
        }
      } else if (this.titleAlpha > 0) {
        this.titleAlpha = displayAlpha(this.titleAlpha - 0.1);
        this.playAlpha = displayAlpha(this.playAlpha - 0.1);
      }
      for (const piece of PAUSE.pieces) {
        if (!piece.name.startsWith('btn')) continue;
        const base = piece.name === 'btnPlay_mc' ? 4 : 1;
        const target = this.hovered === piece.name ? base + (base === 4 ? 0.5 : 0.25) : base;
        this.scales[piece.name] = this.scales[piece.name] * 0.8 + target * 0.2;
      }
      this.positions.btnPlay_mc = { x: 275, y: this.playAlpha <= 0 ? -72 : 232.4 };
    }
    const rate = this.phase === 'menu' ? 0.1 : 0.07,
      retain = this.phase === 'menu' ? 0.9 : 0.93;
    for (const [name, out] of Object.entries(exits)) {
      const target =
        this.phase === 'menu' ? PAUSE.pieces.find((piece) => piece.name === name)! : PAUSE.out[out];
      const p = this.positions[name];
      p.x = displayPixel(p.x * retain + target.x * rate);
      p.y = displayPixel(p.y * retain + target.y * rate);
    }
  }
}
