import { Application, ColorMatrixFilter, Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { TankPart } from '../core/types';
import { partById } from '../data/catalog';
import { SwfSymbolView } from './swf-symbol-view';
import { SwfTextures } from './swf-textures';
import { rotate } from '../core/math';

type Layer = 'design' | 'draft' | 'preview';
interface PartView {
  type: number;
  born: number;
  wrapper: Container;
  view: SwfSymbolView;
}
export interface ArtworkPart {
  part: TankPart;
  alpha?: number;
  invalid?: boolean;
}

/** One offscreen WebGL scene supplies live artwork to the creator's Canvas2D surfaces. */
export class CreatorArtwork {
  private app = new Application();
  private textures = new SwfTextures();
  private groups = new Map<Layer, { root: Container; parts: Map<string, PartView> }>();
  private gray = new ColorMatrixFilter();
  private destroyed = false;
  constructor(private pack: AssetPack) {
    this.gray.greyscale(1, false);
  }
  async init() {
    await this.app.init({
      width: 350,
      height: 350,
      resolution: 2,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: false,
      preference: 'webgl',
      powerPreference: 'low-power',
      preserveDrawingBuffer: true,
    });
    if (this.destroyed) this.app.destroy({ removeView: true }, { children: true });
  }
  private group(layer: Layer) {
    let group = this.groups.get(layer);
    if (!group) {
      const root = new Container();
      root.position.set(175, 175);
      group = { root, parts: new Map() };
      this.groups.set(layer, group);
    }
    return group;
  }
  draw(ctx: CanvasRenderingContext2D, layer: Layer, parts: ArtworkPart[], frame: number) {
    const group = this.group(layer),
      active = new Set(parts.map(({ part }) => part.key));
    for (const [key, node] of group.parts) {
      if (!active.has(key)) {
        node.view.destroy();
        node.wrapper.destroy();
        group.parts.delete(key);
      }
    }
    for (const { part, alpha = 1, invalid = false } of parts) {
      let node = group.parts.get(part.key);
      if (node && node.type !== part.type) {
        node.view.destroy();
        node.wrapper.destroy();
        group.parts.delete(part.key);
        node = undefined;
      }
      if (!node) {
        const symbol = partById(part.type)?.symbol;
        if (!symbol) continue;
        const view = new SwfSymbolView(symbol, this.pack, this.textures, { random: Math.random }),
          wrapper = new Container();
        wrapper.addChild(view.root);
        group.root.addChild(wrapper);
        node = { type: part.type, born: frame, view, wrapper };
        group.parts.set(part.key, node);
      }
      const { wrapper, view } = node;
      wrapper.position.set(part.x, part.y);
      wrapper.scale.set(part.scale);
      wrapper.rotation = (part.rotation * Math.PI) / 180;
      view.setParentAlpha(alpha);
      wrapper.filters = invalid ? [this.gray] : null;
      group.root.setChildIndex(wrapper, group.root.children.length - 1);
      view.update(Math.max(1, frame - node.born + 1), undefined, 0, part.y);
    }
    this.app.stage.removeChildren();
    this.app.stage.addChild(group.root);
    this.app.render();
    ctx.drawImage(this.app.canvas, -175, -175, 350, 350);
  }
  /** Dropping moves the existing draft clips into the tank without restarting their timelines. */
  adoptDraft(parts: TankPart[]) {
    const draft = this.groups.get('draft');
    if (!draft) return;
    const design = this.group('design');
    for (const part of parts) {
      const key = part.key.endsWith('-twin') ? 'preview-twin' : 'preview',
        node = draft.parts.get(key);
      if (!node) continue;
      draft.parts.delete(key);
      design.parts.set(part.key, node);
      design.root.addChild(node.wrapper);
    }
  }
  hitPart(part: TankPart, x: number, y: number) {
    const view = this.groups.get('design')?.parts.get(part.key)?.view;
    if (!view) return this.pack.hitDesignPart(part, x, y);
    const local = rotate(
      { x: (x - part.x) / part.scale, y: (y - part.y) / part.scale },
      -part.rotation,
    );
    return view.hitTest(local.x, local.y);
  }
  restartClusters(parts: TankPart[]) {
    for (const part of parts) {
      if (part.type >= 1500 && part.type <= 1600)
        this.groups.get('design')?.parts.get(part.key)?.view.gotoAndPlay(1, part.y);
    }
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const group of this.groups.values()) {
      for (const node of group.parts.values()) node.view.destroy();
      group.root.destroy({ children: true });
    }
    this.groups.clear();
    this.gray.destroy();
    if (this.app.renderer) this.app.destroy({ removeView: true }, { children: true });
    this.textures.destroy();
  }
}
