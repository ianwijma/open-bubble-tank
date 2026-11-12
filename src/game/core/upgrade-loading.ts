export type UpgradeSlotId = 1 | 2 | 3;
export type UpgradeRootFrame = 1 | 2 | 3 | 4;

/** TankDesign satisfies this without importing catalog, simulation or artwork ownership. */
export interface UpgradeLoadingTank {
  readonly classId: number;
}

export interface UpgradeLoadRequest {
  readonly slotId: UpgradeSlotId;
  readonly classId: number;
  /** Source TAG is requested class followed by authored slot, e.g. class1/slot2 = "12". */
  readonly tag: string;
}

/** A logical initialization identity, never a renderer/clip. Receipt alone is not success. */
export interface UpgradePreviewReceipt<T> {
  readonly slotId: UpgradeSlotId;
  readonly tank: T;
  attached: boolean;
}

export interface UpgradeLoadingCard<T> {
  readonly authoredX: number;
  x: number;
  attached: boolean;
  clickListener: boolean;
  editClickListener: boolean;
  /** Repeated successful source results append previews rather than deduplicating them. */
  readonly previews: UpgradePreviewReceipt<T>[];
}

export interface UpgradeLoadingSlot<T> {
  readonly id: UpgradeSlotId;
  requestedClass: number | null;
  /** arrTankPreviews[id] is written before preview creation/field/listener installation. */
  tank: T | null;
  tankClass: number | null;
  readonly card: UpgradeLoadingCard<T>;
}

export interface UpgradeRecenterBlock {
  readonly slotId: UpgradeSlotId;
  /** An error may follow removal and an earlier sibling shift; those writes survive. */
  readonly outcome: 'retained' | 'removed' | 'error';
}

type Three<T> = [T, T, T];

/** Unused pure draft of UpgradeMenu._-96, SearchFailed, SecondSetup and _-aG.
 * Source: re/bt3/export_scripts/scripts/UpgradeMenu.as:159–174,210–298,478–641,787–801;
 * export_pcode/scripts/UpgradeMenu.pcode: _-96 ofs003c→002e→0016, _-aG ofs037c–0535.
 *
 * The caller resolves requests using the existing lookup/RNG policy. For each callback,
 * receiveTank precedes initialization, completeAttachment reports a successful preview,
 * fields and both CLICK listeners, then finishResults runs ONCE after the result array.
 * There is no timeout, null completion, counter clamp or asynchronous scheduling policy.
 * Motion, selection/destruction, bitmap history and actual artwork remain external.
 */
export class UpgradeLoadingState<T extends UpgradeLoadingTank = UpgradeLoadingTank> {
  readonly slots: Three<UpgradeLoadingSlot<T>>;
  /** Named properties can survive removal; cached slot.card identities always survive.
   * Entries may be set null to represent an actually absent source name. Ordinary root
   * frame changes do not do this. These are model records, not display references.
   */
  readonly namedCards: Three<UpgradeLoadingCard<T> | null>;
  sentinel: Readonly<{ tank: null; classId: 0 }> | null = null;
  pending = 0;
  rootFrame: UpgradeRootFrame = 1;
  loadingAnimationFrame = 1;

  /** Supply authored positions from numerical layout data; this model owns no importer. */
  constructor(
    readonly cachedAvatarClass: number,
    authoredX: readonly [number, number, number],
  ) {
    const makeSlot = (id: UpgradeSlotId): UpgradeLoadingSlot<T> => ({
      id,
      requestedClass: null,
      tank: null,
      tankClass: null,
      card: {
        authoredX: authoredX[id - 1],
        x: authoredX[id - 1],
        attached: true,
        clickListener: false,
        editClickListener: false,
        previews: [],
      },
    });
    this.slots = [makeSlot(1), makeSlot(2), makeSlot(3)];
    this.namedCards = [this.slots[0].card, this.slots[1].card, this.slots[2].card];
  }

  get initialized() {
    // _-96 always pushes index0, even when no slot receives a tank.
    return this.sentinel !== null;
  }

  slot(id: UpgradeSlotId) {
    return this.slots[id - 1];
  }

  /** SecondSetup counts using the constructor cache; _-96 reads the LIVE avatar class. */
  secondSetup(liveAvatarClass: number): UpgradeLoadRequest[] {
    this.pending = this.cachedAvatarClass === 1 || this.cachedAvatarClass === 6 ? 2 : 3;
    if (this.initialized) {
      this.pending = 0;
      this.finishResults(); // _-aG([]): no lookup, RNG draw, preview or card replacement.
      return [];
    }
    this.sentinel = Object.freeze({ tank: null, classId: 0 });
    return this.requests(liveAvatarClass, false);
  }

  /** SearchFailed retries valid live-class slots lacking a card CLICK listener (AS159–174). */
  searchFailed(liveAvatarClass: number): UpgradeLoadRequest[] {
    return this.requests(liveAvatarClass, true);
  }

  private requests(liveAvatarClass: number, onlyWithoutClick: boolean): UpgradeLoadRequest[] {
    const requests: UpgradeLoadRequest[] = [];
    for (const slot of this.slots) {
      const classId = liveAvatarClass + slot.id - 2;
      if (classId <= 0 || classId >= 7 || (onlyWithoutClick && slot.card.clickListener)) continue;
      slot.requestedClass = classId;
      requests.push({ slotId: slot.id, classId, tag: `${classId}${slot.id}` });
    }
    return requests;
  }

  /** AS498–505: successful DATA writes its actual class, which need not equal the TAG. */
  receiveTank(id: UpgradeSlotId, tank: T | null): UpgradePreviewReceipt<T> | null {
    if (tank === null) return null;
    const slot = this.slot(id);
    slot.tank = tank;
    slot.tankClass = tank.classId;
    return { slotId: id, tank, attached: false };
  }

  /** AS521–539 / pcode ofs037c: call only after attachment, fields and listeners succeed.
   * A duplicate callback gets a NEW receipt and decrements again, as in the source.
   * A receipt cannot report the same installation twice; this is the adapter contract.
   */
  completeAttachment(receipt: UpgradePreviewReceipt<T>) {
    if (receipt.attached) throw new Error('Upgrade preview installation already completed');
    const card = this.slot(receipt.slotId).card;
    receipt.attached = true;
    card.previews.push(receipt);
    card.clickListener = true;
    card.editClickListener = true;
    --this.pending;
  }

  /** AS543–603: the callback tail, including an explicitly empty result array.
   * Three independent try/catch blocks: failed removal aborts that block before shifts;
   * earlier successful writes survive, and later blocks still execute.
   */
  finishResults(): UpgradeRecenterBlock[] {
    if (this.pending !== 0) return [];
    const first = this.removeUnavailable(1, () => {
      this.shiftIfNamed(2, -90.5);
      this.shiftIfNamed(3, -90.5);
    });
    const second = this.removeUnavailable(2, () => {
      this.shiftIfNamed(1, 90.5);
      // AS572–574 / pcode ofs0472: tests viewer2's name, then writes viewer3.x.
      // Do not replace this with shiftIfNamed(3): a missing viewer3 throws here.
      if (this.namedCards[1] !== null) this.requireNamed(3).x -= 90.5;
    });
    const third = this.removeUnavailable(3, () => {
      this.shiftIfNamed(1, 90.5);
      this.shiftIfNamed(2, 90.5);
    });
    this.rootFrame = 2;
    return [first, second, third];
  }

  private requireNamed(id: UpgradeSlotId) {
    const card = this.namedCards[id - 1];
    if (card === null) throw new Error(`Missing authored upgrade card ${id}`);
    return card;
  }

  private shiftIfNamed(id: UpgradeSlotId, delta: number) {
    const card = this.namedCards[id - 1];
    if (card !== null) card.x += delta;
  }

  private removeUnavailable(id: UpgradeSlotId, shifts: () => void): UpgradeRecenterBlock {
    try {
      const card = this.requireNamed(id);
      if (card.clickListener) return { slotId: id, outcome: 'retained' };
      // removeChild(detached) throws even though the named property is still retained.
      if (!card.attached) throw new Error(`Upgrade card ${id} already removed`);
      card.attached = false;
      shifts();
      return { slotId: id, outcome: 'removed' };
    } catch {
      // Source catches Error per block; only model name/removal failures occur here.
      return { slotId: id, outcome: 'error' };
    }
  }

  /** _-Zo(false), ONLY when the current progression entry is absent (AS793–796).
   * Existing/saved entries destroy instead; their lifetime belongs to the caller.
   */
  returnFromUnsavedCreator(liveAvatarClass: number) {
    this.rootFrame = 1;
    return this.secondSetup(liveAvatarClass);
  }

  /** Root1935 frame3/4 retain named cards and their children; no loading reset or motion. */
  setRootFrame(frame: UpgradeRootFrame) {
    this.rootFrame = frame;
  }

  /** LoadingAnimation_199.as frame25 immediately gotoAndPlay(3).
   * One explicit child-art tick, independent of root frame and UpgradeMenuMotion.Run.
   * Constructor/frame-script scheduling relative to source Run is outside this model.
   */
  advanceLoadingAnimation() {
    this.loadingAnimationFrame =
      this.loadingAnimationFrame === 24 ? 3 : this.loadingAnimationFrame + 1;
  }
}
