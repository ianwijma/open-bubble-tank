import { UpgradeMenuMotion } from '../core/upgrade-motion';
import { PauseBitmapHistory } from '../core/bitmap-blur';
import type { StageRuntime } from './stage-runtime';
import {
  UpgradeLoadingState,
  type UpgradeSlotId,
  type UpgradePreviewReceipt,
} from '../core/upgrade-loading';
import { UPGRADE_SCREEN } from '../core/upgrade-screen';
import type { TankDesign } from '../core/types';

/** One browser-owned UpgradeMenu instance survives its creator/viewer children. */
export class UpgradeMenu {
  readonly motion = new UpgradeMenuMotion();
  readonly loading: UpgradeLoadingState<TankDesign>;
  history: PauseBitmapHistory | undefined;
  private observers = new Set<() => void>();
  private unsubscribe: () => void;
  private disposed = false;
  private receipts = new Map<UpgradeSlotId, UpgradePreviewReceipt<TankDesign>>();
  private changes = new Set<() => void>();
  private revision = 0;
  captureCount = 0;

  constructor(
    readonly stage: StageRuntime,
    private readonly onComplete: () => void,
    avatarClass = 1,
  ) {
    this.loading = new UpgradeLoadingState(
      avatarClass,
      UPGRADE_SCREEN.viewers.cards.map((card) => card.matrix.tx / 20) as [number, number, number],
    );
    const capture = stage.capture.capture({ refresh: true });
    if (capture) {
      this.history = new PauseBitmapHistory(550, 450, capture.data);
      this.captureCount = 1;
    }
    this.unsubscribe = stage.subscribe({
      step: () => {
        this.loading.advanceLoadingAnimation();
        const commands = this.motion.advance();
        this.history?.advance(this.motion.counter, this.motion.closing);
        if (commands.some((command) => command.type === 'finish')) this.complete();
      },
      draw: () => {
        for (const observer of this.observers) observer();
      },
    });
  }

  readonly subscribe = (observer: () => void) => {
    this.changes.add(observer);
    return () => {
      this.changes.delete(observer);
    };
  };
  readonly snapshot = () => this.revision;
  private changed() {
    this.revision++;
    for (const observer of this.changes) observer();
  }

  /** Offline requests have already used World's exact lookup and preference draws. */
  setupOffers(liveAvatarClass: number, offers: readonly TankDesign[]) {
    this.loading.setRootFrame(1);
    for (const request of this.loading.secondSetup(liveAvatarClass)) {
      const receipt = this.loading.receiveTank(
        request.slotId,
        offers.find((tank) => tank.classId === request.classId) ?? null,
      );
      if (receipt) this.receipts.set(request.slotId, receipt);
    }
    this.loading.finishResults();
    this.changed();
  }

  /** Browser readiness adapter: report once after the fitted preview actually paints. */
  previewReady(id: UpgradeSlotId) {
    if (this.disposed) return;
    const receipt = this.receipts.get(id);
    if (!receipt || receipt.attached) return;
    this.loading.completeAttachment(receipt);
    this.loading.finishResults();
    this.changed();
  }

  showChild(child: 'creator' | 'viewer') {
    this.motion.showChild(child);
    this.loading.setRootFrame(3);
    this.changed();
  }

  returnToOffers(liveAvatarClass: number) {
    this.motion.returnToOffers();
    this.loading.returnFromUnsavedCreator(liveAvatarClass);
    this.changed();
  }

  showConfirmation() {
    this.loading.setRootFrame(4);
    this.changed();
  }

  beginClosing() {
    if (!this.motion.beginClosing()) return false;
    for (const { card } of this.loading.slots) {
      card.clickListener = false;
      card.editClickListener = false;
    }
    this.changed();
    return true;
  }

  observe(observer: () => void) {
    this.observers.add(observer);
    observer();
    return () => {
      this.observers.delete(observer);
    };
  }

  /** Creator/search returns and confirmation No destroy directly, without a card fade. */
  complete() {
    if (this.disposed) return;
    this.dispose();
    this.onComplete();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.unsubscribe();
    this.history?.dispose();
    this.observers.clear();
    this.changes.clear();
  }
}
