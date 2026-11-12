import { displayAlpha } from './display-values';

export type UpgradeChild = 'creator' | 'viewer';
export type UpgradeMenuCommand =
  | { type: 'update-viewer' }
  | { type: 'attach-bottom-handlers' }
  | { type: 'save-bitmap'; index: number }
  | { type: 'blur-bitmap' }
  | { type: 'restore-bitmap'; index: number; written: boolean }
  | { type: 'write-foreground-alpha'; value: number; alpha: number }
  | { type: 'finish' };

/** UpgradeMenu.Run owns a retained menu clock, independently of its child screen.
 * Setup's initial capture and actual offer/listener readiness belong to its caller.
 */
export class UpgradeMenuMotion {
  /** Source _-Mc and _-LT: the latter points at the next unwritten history slot. */
  counter = 0;
  historyIndex = 0;
  savedFrames = 0;
  /** Signed DisplayObject.alpha getter, not CSS-clamped paint opacity. */
  foregroundAlpha = 1;
  bottomHandlersAttached = false;
  closing = false;
  finished = false;
  child: UpgradeChild | null = null;

  /** Loaded offers are clickable before _-EW enables the separate bottom buttons. */
  get cardInputEnabled() {
    return !this.finished && !this.closing && this.child === null;
  }

  /** ViewerUp removes card listeners, but never removes the bottom listeners. */
  get bottomInputEnabled() {
    return !this.finished && this.bottomHandlersAttached && this.child === null;
  }

  /** Call only after the synchronous source selection/avatar work succeeds. */
  beginClosing() {
    if (!this.cardInputEnabled) return false;
    this.closing = true;
    return true;
  }

  showChild(child: UpgradeChild) {
    if (this.finished) return false;
    this.child = child;
    return true;
  }

  /** SecondSetup may rebuild offers; it does not restart this presentation. */
  returnToOffers() {
    if (this.finished) return false;
    this.child = null;
    return true;
  }

  /** Ordered commands describe bitmap work without owning a DOM, image or world. */
  advance(): UpgradeMenuCommand[] {
    if (this.finished) return [];
    const commands: UpgradeMenuCommand[] = [];
    if (this.child === 'viewer') commands.push({ type: 'update-viewer' });
    if (this.closing) {
      if (this.counter < 0) {
        this.finished = true;
        this.child = null;
        commands.push({ type: 'finish' });
        return commands;
      }
      this.counter--;
      const value = this.foregroundAlpha - 0.025;
      this.foregroundAlpha = displayAlpha(value);
      commands.push({ type: 'write-foreground-alpha', value, alpha: this.foregroundAlpha });
      if (this.counter % 2 === 0) {
        commands.push({
          type: 'restore-bitmap',
          index: this.historyIndex,
          written: this.historyIndex >= 0 && this.historyIndex < this.savedFrames,
        });
        this.historyIndex--;
      }
      return commands;
    }
    if (this.counter === 38) {
      this.bottomHandlersAttached = true;
      commands.push({ type: 'attach-bottom-handlers' });
    }
    if (this.counter < 39) {
      this.counter++;
      if (this.counter % 2 === 0) {
        commands.push({ type: 'save-bitmap', index: this.historyIndex });
        commands.push({ type: 'blur-bitmap' });
        this.historyIndex++;
        this.savedFrames++;
      }
    }
    return commands;
  }
}
