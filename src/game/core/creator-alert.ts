import { displayAlpha } from './display-values';

/** Retained alert937 state; Timer(2000,1) is separate from ENTER_FRAME fading. */
export class CreatorAlertClock {
  visible = false;
  alpha = 1;
  message = '';
  timerRunning = false;
  fading = false;

  show(message: string) {
    this.message = message;
    this.visible = true;
    this.timerRunning = true;
    // _-d4 restarts the timer, but does not reset alpha or remove an existing fade.
  }
  timerComplete() {
    if (!this.timerRunning) return;
    this.timerRunning = false;
    this.fading = true;
  }
  dismiss() {
    this.visible = false;
    this.timerRunning = false;
    // _-V8 leaves ENTER_FRAME attached, including while the clip is hidden.
  }
  step(frames = 1) {
    for (let i = 0; i < frames && this.fading; i++) {
      this.alpha = displayAlpha(this.alpha - 0.01);
      if (this.alpha <= 0) {
        this.alpha = 1;
        this.visible = false;
        this.fading = false;
      }
    }
  }
}
