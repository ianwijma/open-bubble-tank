import type { WorldMode } from '../core/types';

type RunMode = 'playing' | 'stopped' | 'transit' | 'collapse';
type Dialog = 'paused' | 'upgrade' | 'secondary-help' | 'won';

/** BTAGameWorld._-Up and intCurrentGameMode are independent of attached dialogs. */
export class WorldFlow {
  state: RunMode = 'playing';
  saved: RunMode = 'playing';
  private dialogs = new Set<Dialog>();
  private crossingPauseSaved: RunMode | null = null;

  get mode(): WorldMode {
    for (const dialog of ['upgrade', 'secondary-help', 'paused', 'won'] as const)
      if (this.dialogs.has(dialog)) return dialog;
    return this.state;
  }
  /** Direct host/fixture assignment replaces the view; source callbacks use the methods below. */
  set mode(value: WorldMode) {
    this.dialogs.clear();
    if (value === 'playing' || value === 'transit' || value === 'collapse' || value === 'stopped')
      this.state = value;
    else {
      this.state = 'stopped';
      this.dialogs.add(value);
    }
  }
  pause() {
    // Preserve the browser's existing mid-crossing pause adapter.
    if (this.dialogs.size || (this.state !== 'playing' && this.state !== 'transit')) return false;
    this.crossingPauseSaved = this.state === 'transit' ? this.saved : null;
    this.saved = this.state;
    this.state = 'stopped';
    this.dialogs.add('paused');
    return true;
  }
  resume() {
    if (!this.dialogs.delete('paused')) return false;
    this.state = this.saved;
    // Flash does not open PauseMenu from state2. Its existing browser adapter
    // must not overwrite the source crossing's eventual return mode.
    if (this.crossingPauseSaved !== null) this.saved = this.crossingPauseSaved;
    this.crossingPauseSaved = null;
    return true;
  }
  openUpgrade() {
    this.saved = this.state;
    this.state = 'stopped';
    this.dialogs.add('upgrade');
  }
  closeUpgrade() {
    this.state = this.saved;
    this.dialogs.delete('upgrade');
  }
  openSecondaryHelp() {
    // PlaceAvatar assigns both fields to1; Close writes only _-Up=0.
    this.state = this.saved = 'stopped';
    this.dialogs.add('secondary-help');
  }
  closeSecondaryHelp() {
    if (!this.dialogs.delete('secondary-help')) return false;
    this.state = 'playing';
    return true;
  }
  openWin() {
    this.saved = this.state;
    this.state = 'stopped';
    this.dialogs.add('won');
  }
  closeWin() {
    if (!this.dialogs.delete('won')) return false;
    this.state = this.saved;
    return true;
  }
  cross() {
    this.saved = this.state;
    this.state = 'transit';
  }
  arrive() {
    this.state = this.saved;
  }
  collapse() {
    this.saved = this.state;
    this.state = 'collapse';
  }
  restoreControl() {
    this.state = this.saved;
  }
}

/** Move dereferences the destination before its nullable field-Run guards can help. */
export class CrossingTargetReadError extends Error {
  constructor() {
    super('MoveAvatarToNewBubblefieldLocation read a missing destination');
  }
}

/** A cached ordinary EnemyAI keeps state1 after Deactivate cleared its data/movement. */
export class DeactivatedActorRunError extends Error {
  constructor() {
    super('EnemyAI.Run read deactivated actor data or movement');
  }
}

/** RemoveEnemy reaches removeChild after medal polling but before array splicing. */
export class FieldChildRemovalError extends Error {
  constructor() {
    super('Bubblefield removal callback no longer owns its actor child');
  }
}
