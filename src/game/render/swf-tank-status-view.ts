import { ColorMatrixFilter, Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { StatusDecoration, Tank, TankChild } from '../core/types';
import { INFECTED_ART, STATUS_ART } from '../data/status-art';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** Authored _-Zx.EffectMeCrazy marks and _-U4 infection overlay, in tank coordinates. */
export class SwfTankStatusView {
  root = new Container();
  infectionFilter: ColorMatrixFilter | null = null;
  private decoration?: StatusDecoration;
  private marks: SwfSymbolView[] = [];
  private infected?: SwfSymbolView;
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {}
  update(tank: Tank) {
    if (this.decoration !== tank.statusDecoration) {
      for (const view of this.marks) view.destroy();
      this.marks = [];
      this.decoration = tank.statusDecoration;
      if (this.decoration)
        for (const mark of this.decoration.marks) {
          const view = new SwfSymbolView(
            STATUS_ART[this.decoration.kind],
            this.assets,
            this.textures,
          );
          view.root.position.set(mark.x, mark.y);
          view.root.angle = mark.angle;
          this.root.addChild(view.root);
          this.marks.push(view);
        }
    }
    if (this.decoration)
      for (const [index, view] of this.marks.entries()) {
        view.setParentAlpha(tank.alpha);
        view.updatePose(this.assets.statusClip(tank, index));
      }
    if (tank.status.infect > 0) {
      if (!this.infected) {
        this.infected = new SwfSymbolView(INFECTED_ART, this.assets, this.textures);
        this.root.addChild(this.infected.root);
        this.infectionFilter = new ColorMatrixFilter();
        // _-U4's Flash ColorMatrixFilter uses 0..255 offsets; Pixi uses normalized offsets.
        this.infectionFilter.matrix = [
          0.15,
          0.15,
          0.5,
          0,
          100 / 255,
          0.15,
          0.5,
          0.15,
          0,
          0,
          0.5,
          0.15,
          0.15,
          0,
          0,
          0,
          0,
          0,
          1,
          0,
        ];
      }
      this.infected.root.scale.set((tank.radius * 1.5) / 36);
      this.infected.setParentAlpha(tank.alpha);
      this.infected.root.angle = tank.infectionAngle;
      this.infected.updatePose(this.assets.infectionClip(tank));
    } else if (this.infected) {
      this.infected.destroy();
      this.infected = undefined;
      this.infectionFilter?.destroy();
      this.infectionFilter = null;
    }
  }
  /** TankView may mount these direct children alongside parts and protection. */
  displayEntries(): [TankChild, Container][] {
    return [
      ...this.marks.map((view): [TankChild, Container] => ['status', view.root]),
      ...(this.infected ? [['infection', this.infected.root] as [TankChild, Container]] : []),
    ];
  }
  destroy() {
    for (const view of this.marks) view.destroy();
    this.infected?.destroy();
    this.infectionFilter?.destroy();
    this.root.destroy({ children: true });
  }
}
