import { Application, ColorMatrixFilter, Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { TankPart } from '../core/types';
import { partById } from '../data/catalog';
import { SwfSymbolView } from './swf-symbol-view';
import { SwfTextures } from './swf-textures';
import { creatorThumbnailScale } from '../core/creator-details';
import { rotate } from '../core/math';
import { SwfGlowFilter } from './swf-glow-filter';
import { VIEWER_HOVER_GLOW } from '../core/viewer-highlights';

type Layer = 'design' | 'draft' | 'preview' | 'details' | `viewer:${string}`;
interface PartView {
  type: number;
  born: number;
  wrapper: Container;
  view: SwfSymbolView;
  initialWidth: number;
  thumbnailScale: number;
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
  private hoverGlow: SwfGlowFilter | undefined;
  private destroyed = false;
  constructor(
    private pack: AssetPack,
    private size = 350,
  ) {
    this.gray.greyscale(1, false);
  }
  async init() {
    await this.app.init({
      width: this.size,
      height: this.size,
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
      root.position.set(this.size / 2, this.size / 2);
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
      thumbnailScale: creatorThumbnailScale(bounds.width, bounds.height),
    };
  }
  clearLayer(layer: Layer) {
    const group = this.groups.get(layer);
    if (!group) return;
    for (const node of group.parts.values()) {
      node.view.destroy();
      node.wrapper.destroy();
    }
    group.parts.clear();
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
  draw(
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    parts: ArtworkPart[],
    frame: number,
    scale = 1,
    highlighted = false,
  ) {
    const group = this.group(layer),
      active = new Set(parts.map(({ part }) => part.key));
    group.root.scale.set(scale);
    if (highlighted) this.hoverGlow ??= new SwfGlowFilter(VIEWER_HOVER_GLOW);
    group.root.filters = highlighted ? [this.hoverGlow!] : null;
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
      wrapper.scale.set(part.scale * (layer === 'details' ? node.thumbnailScale : 1));
      wrapper.rotation = (part.rotation * Math.PI) / 180;
      view.setParentAlpha(alpha);
      wrapper.filters = invalid ? [this.gray] : null;
      group.root.setChildIndex(wrapper, group.root.children.length - 1);
      view.update(Math.max(1, frame - node.born + 1), undefined, 0, part.y);
    }
    this.app.stage.removeChildren();
    this.app.stage.addChild(group.root);
    this.app.render();
    ctx.drawImage(this.app.canvas, -this.size / 2, -this.size / 2, this.size, this.size);
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
  localBounds(part: TankPart, layer: Layer = 'design') {
    const view = this.groups.get(layer)?.parts.get(part.key)?.view;
    return view ? (view.scriptBounds() ?? { x: 0, y: 0, width: 0, height: 0 }) : undefined;
  }
  removeLayer(layer: Layer) {
    this.clearLayer(layer);
    this.groups.get(layer)?.root.destroy();
    this.groups.delete(layer);
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
    this.hoverGlow?.destroy();
    if (this.app.renderer) this.app.destroy({ removeView: true }, { children: true });
    this.textures.destroy();
  }
}
