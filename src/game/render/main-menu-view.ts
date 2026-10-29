import { Container, Matrix } from 'pixi.js';
import type { AssetPack, SwfGlowFilter as GlowOptions } from '../assets/asset-pack';
import { SwfClip } from '../assets/swf-clip';
import { MAIN_MENU, type MainMenuMotion } from '../core/main-menu';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';
import { SwfGlowFilter } from './swf-glow-filter';
import { menuLocal, type MenuTarget } from '../core/menu-hit';
import type { Vec } from '../core/types';
import type { SeriesControl } from '../core/menu-series';

/** Menu display objects retain independent child timelines, including the title's stop(179). */
export class MainMenuView {
  readonly root = new Container();
  private title: SwfSymbolView;
  private titlePose: SwfClip;
  private controls;
  private glow: SwfGlowFilter;
  private series: SwfSymbolView;
  constructor(
    private pack: AssetPack,
    textures: RasterTextures,
  ) {
    //556 depth1/clipDepth2 makes487 a nonpainting mask. All controls start above depth2.
    this.controls = MAIN_MENU.controls.map((piece) => {
      const view = new SwfSymbolView(piece.symbol, pack, textures),
        pose = new SwfClip(piece.symbol, pack),
        wrapper = new Container();
      wrapper.addChild(view.root);
      this.root.addChild(wrapper);
      pose.advance(1);
      return { piece, view, pose, wrapper };
    });
    this.glow = new SwfGlowFilter(this.glowOptions(0));
    this.controls[0].wrapper.filters = [this.glow];
    this.series = new SwfSymbolView(MAIN_MENU.series.symbol, pack, textures);
    this.root.addChild(this.series.root);
    this.title = new SwfSymbolView(MAIN_MENU.title.symbol, pack, textures);
    this.titlePose = new SwfClip(MAIN_MENU.title.symbol, pack);
    const m = MAIN_MENU.title.matrix;
    this.title.root.setFromMatrix(new Matrix(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20));
    this.root.addChild(this.title.root);
  }
  private glowOptions(strength: number): GlowOptions {
    return {
      kind: 'glow',
      color: [255, 255, 255, 255],
      blurX: 7,
      blurY: 7,
      strength,
      passes: 3,
      inner: false,
      knockout: false,
      compositeSource: true,
    };
  }
  hover(name: string, over: boolean) {
    const control = this.controls.find((c) => c.piece.name === name);
    const inner = [...(control?.pose.children.values() ?? [])].find(
      (c) => c.placement.name === 'inner',
    );
    if (over) inner?.clip.gotoAndPlay(2);
    else inner?.clip.gotoAndStop(1);
  }
  hit(point: Vec, motion: MainMenuMotion): MenuTarget | undefined {
    const title = menuLocal(point, MAIN_MENU.title.matrix);
    if (title && this.pack.hitClip(this.titlePose, title.x, title.y)) return { kind: 'blocked' };
    const series = menuLocal(point, MAIN_MENU.series.matrix)!;
    for (const p of [...motion.series.pose.placements].reverse()) {
      if (!p.name) continue;
      const local = menuLocal(series, p.matrix),
        child = motion.series.pose.children.get(p.depth)!.clip;
      if (local && this.pack.hitClip(child, local.x, local.y))
        return { kind: 'series', name: p.name as SeriesControl };
    }
    if (this.pack.hitClip(motion.series.pose, series.x, series.y)) return { kind: 'series' };
    for (const { piece, pose } of [...this.controls].reverse()) {
      const local = menuLocal(point, piece.matrix)!;
      const inner = [...pose.children.values()].find((child) => child.placement.name === 'inner')!;
      const inInner = menuLocal(local, inner.placement.matrix)!;
      if (this.pack.hitClip(inner.clip, inInner.x, inInner.y))
        return { kind: 'control', name: piece.name };
      // The source dispatches actions only when event.target.parent is the named button.
      // Icon-only geometry outside inner490 targets the wrapper, which has no action branch.
      if (this.pack.hitClip(pose, local.x, local.y))
        return { kind: 'decoration', name: piece.name };
    }
  }
  update(motion: MainMenuMotion) {
    for (const { piece, view, pose, wrapper } of this.controls) {
      const m = piece.matrix;
      wrapper.visible = motion.controlAlpha > 0;
      wrapper.setFromMatrix(
        new Matrix(
          m.a,
          m.b,
          m.c,
          m.d,
          motion.parked ? -100 : m.tx / 20,
          motion.parked ? -100 : m.ty / 20,
        ),
      );
      pose.advance(motion.age + 1);
      view.setParentAlpha(motion.controlAlpha);
      view.updatePose(pose);
    }
    this.glow.setOptions(this.glowOptions(motion.glowStrength));
    const s = MAIN_MENU.series.matrix;
    this.series.root.visible = motion.controlAlpha > 0;
    this.series.root.position.set(
      motion.parked ? -100 : s.tx / 20,
      motion.parked ? -100 : s.ty / 20,
    );
    this.series.setParentAlpha(motion.controlAlpha);
    this.series.updatePose(motion.series.pose);
    this.titlePose.advance(motion.age + 1);
    this.title.root.visible = motion.titleAlpha > 0;
    this.title.setParentAlpha(motion.titleAlpha);
    this.title.updatePose(this.titlePose);
  }
  get titleFrame() {
    return this.titlePose.children.get(1)?.clip.frame;
  }
  destroy() {
    this.title.destroy();
    this.series.destroy();
    for (const control of this.controls) control.view.destroy();
    this.glow.destroy();
    this.root.destroy({ children: true });
  }
}
