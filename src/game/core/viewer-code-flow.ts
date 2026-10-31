import type { TankDesign } from './types';
import { ViewerPanes, viewerCardName } from './viewer-panes';

export const viewerToolbar = [
  'btnFirst_mc',
  'btnPrev_mc',
  'btnNext_mc',
  'btnSearchForTanks_mc',
  'btnEnterTankCode_mc',
  'btnEnterTankID_mc',
  'btnSortTanks_mc',
  'btnMainMenu_mc',
  'btnViewLocalTanks_mc',
] as const;
export const viewerToolbarName = (name: string) => `toolbar:${name}`;
/** _-S6/_-P8 and ReturnToViewTanksFromSearch. The creator's back callback is present. */
export class ViewerCodeFlow {
  readonly panes = new ViewerPanes();
  readonly fades = this.panes.fades;
  sortX = 501.6;
  constructor(readonly avatar: boolean) {
    for (const name of viewerToolbar) this.fades.state(viewerToolbarName(name), 1);
    for (const name of ['btnMyAvatar_mc', 'btnCreateATank_mc'])
      this.fades.state(viewerToolbarName(name));
    this.fades.state(viewerToolbarName('btnCurrentPoints_mc'), avatar ? 1 : 0);
  }
  open(detail: boolean) {
    if (detail) this.fades.deleteAfterFade('detail');
    else for (let i = 0; i < 4; i++) this.fades.deleteAfterFade(viewerCardName(i));
    for (const name of viewerToolbar) this.fades.hide(viewerToolbarName(name));
    this.fades.hide(viewerToolbarName('btnMyAvatar_mc'));
    if (!detail) this.fades.hide(viewerToolbarName('btnCreateATank_mc'));
    this.fades.hide(viewerToolbarName('btnCurrentPoints_mc'));
  }
  returnToView(tanks: readonly TankDesign[], local = true) {
    this.sortX = 616.55;
    for (const name of viewerToolbar) this.fades.show(viewerToolbarName(name));
    if (this.avatar) this.fades.show(viewerToolbarName('btnCurrentPoints_mc'));
    this.panes.rebuildCards(tanks.slice(0, 4), local);
    // _-BB's creator-specific button setup removes this hidden profile control again.
    this.fades.cancel(viewerToolbarName('btnMyAvatar_mc'));
    this.fades.state(viewerToolbarName('btnMyAvatar_mc')).alpha = 0;
  }
  /** Browser crypto can complete/cancel during alpha-out; release old clips before rebuilding. */
  returnAfterRead(tanks: readonly TankDesign[], local = true) {
    for (let i = 0; i < 4; i++) this.fades.cancel(viewerCardName(i));
    this.fades.cancel('detail');
    this.returnToView(tanks, local);
  }
  localPosition() {
    this.sortX = 501.6;
  }
}
