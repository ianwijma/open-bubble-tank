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
  previewScale: number;
  initialWidth: number;
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
  private createPart(part: TankPart, frame: number): PartView | undefined {
    const symbol = partById(part.type)?.symbol;
    if (!symbol) return;
    const view = new SwfSymbolView(symbol, this.pack, this.textures, { random: Math.random }),
      wrapper = new Container();
    view.update(1, undefined, 0, part.y);
    const raster = this.pack.part(part.type);
    const bounds =
      view.scriptBounds() ??
      (this.pack.hasPartTimeline(part.type)
        ? { width: 0, height: 0 }
        : {
            width: raster.width - (this.pack.mode === 'swf' ? 4 : 6),
            height: raster.height - (this.pack.mode === 'swf' ? 4 : 6),
          });
    wrapper.addChild(view.root);
    return {
      type: part.type,
      born: frame,
      view,
      wrapper,
      initialWidth: bounds.width,
      previewScale: Math.min(1, 48 / Math.max(bounds.width, bounds.height)),
    };
  }
  /** Measure the actual newly instantiated drag object, before its animation advances. */
  beginDraft(parts: TankPart[], frame: number) {
    const group = this.group('draft');
    for (const node of group.parts.values()) {
      node.view.destroy();
      node.wrapper.destroy();
    }
    group.parts.clear();
    let radius: number | undefined;
    for (const part of parts) {
      const node = this.createPart(part, frame);
      if (!node) continue;
      group.parts.set(part.key, node);
      group.root.addChild(node.wrapper);
      radius ??= (node.initialWidth * part.scale) / 2;
    }
    return radius;
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
        node = this.createPart(part, frame);
        if (!node) continue;
        group.root.addChild(node.wrapper);
        group.parts.set(part.key, node);
      }
      const { wrapper, view } = node;
      wrapper.position.set(part.x, part.y);
      wrapper.scale.set(part.scale * (layer === 'preview' ? node.previewScale : 1));
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
  localBounds(part: TankPart) {
    const view = this.groups.get('design')?.parts.get(part.key)?.view;
    return view ? (view.scriptBounds() ?? { x: 0, y: 0, width: 0, height: 0 }) : undefined;
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
