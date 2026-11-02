import type { TankDesign } from './types';
import { ViewerFades } from './viewer-fades';

export interface ViewerPane {
  tank: TankDesign;
  instance: string;
  ownsArt: boolean;
}
export interface ViewerPaneSnapshot {
  cards: (ViewerPane | null)[];
  detail: ViewerPane | null;
}
export const viewerCardName = (index: number) => `card:${index}`;
/** Source TankLoadingBox ownership, Setup/_-VR/DeleteTank and viewer fade queues. */
export class ViewerPanes {
  private serial = 0;
  private snapshot: ViewerPaneSnapshot = { cards: [null, null, null, null], detail: null };
  private listeners = new Set<() => void>();
  constructor(readonly fades = new ViewerFades()) {
    for (let i = 0; i < 4; i++) {
      fades.state(viewerCardName(i));
      fades.onDelete(viewerCardName(i), () => {
        fades.state(viewerCardName(i)).alpha = 0;
        fades.state(viewerCardName(i)).mouseEnabled = false;
        this.snapshot = {
          ...this.snapshot,
          cards: this.snapshot.cards.map((p, index) => (index === i ? null : p)),
        };
        this.changed();
      });
    }
    fades.state('detail');
    fades.onDelete('detail', () => {
      fades.state('detail').alpha = 0;
      fades.state('detail').mouseEnabled = false;
      this.snapshot = { ...this.snapshot, detail: null };
      this.changed();
    });
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private changed() {
    for (const listener of this.listeners) listener();
  }
  private fresh(tank: TankDesign): ViewerPane {
    return { tank, instance: `pane:${++this.serial}`, ownsArt: true };
  }
  /** Setup immediately replaces each slot at alpha1; ordinary paging has no fade. */
  setup(tanks: readonly TankDesign[]) {
    this.snapshot = {
      ...this.snapshot,
      cards: Array.from({ length: 4 }, (_, i) => (tanks[i] ? this.fresh(tanks[i]) : null)),
    };
    for (let i = 0; i < 4; i++) {
      this.fades.state(viewerCardName(i)).alpha = tanks[i] ? 1 : 0;
      this.fades.state(viewerCardName(i)).mouseEnabled = !!tanks[i];
    }
    this.changed();
  }
  detail(index: number) {
    const pane = this.snapshot.cards[index];
    if (!pane) return;
    // _-VR reparents the same movie; the source card still owns its fading shell.
    this.snapshot = {
      cards: this.snapshot.cards.map((p, i) => (i === index && p ? { ...p, ownsArt: false } : p)),
      detail: { ...pane },
    };
    for (let i = 0; i < 4; i++) this.fades.deleteAfterFade(viewerCardName(i));
    this.fades.show('detail');
    this.changed();
  }
  rebuildCards(tanks: readonly TankDesign[]) {
    this.setup(tanks);
    for (let i = 0; i < 4; i++) this.fades.state(viewerCardName(i)).alpha = 0;
    for (let i = 0; i < 4; i++) if (tanks[i]) this.fades.show(viewerCardName(i));
    this.changed();
  }
  returnToCards(tanks: readonly TankDesign[]) {
    this.rebuildCards(tanks);
    this.fades.deleteAfterFade('detail');
  }
  /** GoToNextTank/GoBackATank: Setup slot1, reparent it to detail, then hide slot1. */
  replaceDetail(tank: TankDesign) {
    this.snapshot = {
      ...this.snapshot,
      cards: this.snapshot.cards.map((p, i) => (i === 0 ? this.fresh(tank) : p)),
    };
    this.fades.state(viewerCardName(0)).alpha = 1;
    this.detail(0);
    this.fades.state(viewerCardName(0)).alpha = 0;
    this.fades.state(viewerCardName(0)).mouseEnabled = false;
    this.changed();
  }
}
