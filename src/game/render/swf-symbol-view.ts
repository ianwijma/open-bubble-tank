import { ColorMatrixFilter, Container, Matrix, Sprite, type Texture } from 'pixi.js';
import type { AssetPack, DisplayPlacement, Raster } from '../assets/asset-pack';
import { SwfClip } from '../assets/swf-clip';
export interface RasterTextures {
  get(raster: Raster): Texture;
  release(raster: Raster): void;
}
export interface ClipPlayback {
  random: () => number;
}

/** Native display list: original matrices advance once per game frame; leaf textures are shared. */
export class SwfSymbolView {
  root = new Container();
  private children = new Map<
    number,
    {
      id: number;
      view: SwfSymbolView;
      color: string;
      pose?: SwfClip;
    }
  >();
  private lastFrame = -1;
  private lastAge = -1;
  private matrix = new Matrix();
  private colorFilter: ColorMatrixFilter | null = null;
  private morphSprite: Sprite | null = null;
  private morphRaster: Raster | null = null;
  private morphRatio = -1;
  private ownedPose?: SwfClip;
  private renderedPose?: SwfClip;
  constructor(
    readonly id: number,
    private assets: AssetPack,
    private textures: RasterTextures,
    playback?: ClipPlayback,
  ) {
    if (playback) this.ownedPose = new SwfClip(id, assets, playback.random);
    if (assets.isMorph(id)) {
      this.morphSprite = new Sprite();
      this.root.addChild(this.morphSprite);
      return;
    }
    const r = assets.leaves.get(id);
    if (r) {
      const s = new Sprite(textures.get(r));
      s.position.set(r.x, r.y);
      s.width = r.width;
      s.height = r.height;
      this.root.addChild(s);
    }
  }
  update(age: number, heldFrame?: number, ratio = 0, y = this.root.y) {
    if (this.morphSprite) {
      if (this.morphRatio === ratio) return;
      const raster = this.assets.morphRaster(this.id, ratio)!;
      this.morphSprite.texture = this.textures.get(raster);
      if (this.morphRaster) this.textures.release(this.morphRaster);
      this.morphRaster = raster;
      this.morphRatio = ratio;
      this.morphSprite.position.set(raster.x, raster.y);
      this.morphSprite.width = raster.width;
      this.morphSprite.height = raster.height;
      return;
    }
    if (this.ownedPose && heldFrame === undefined) {
      this.ownedPose.advance(age, y);
      this.updatePose(this.ownedPose, ratio);
      return;
    }
    const frame = heldFrame ?? age;
    this.paint(age, frame, undefined, heldFrame !== undefined);
  }
  updatePose(pose: SwfClip, ratio = 0) {
    if (this.assets.leaves.has(this.id)) {
      this.renderedPose = pose;
      return;
    }
    if (this.morphSprite) {
      this.renderedPose = pose;
      this.update(pose.age, undefined, ratio);
      return;
    }
    this.paint(pose.age, pose.frame, pose);
  }
  private paint(age: number, frame: number, pose?: SwfClip, held = false) {
    if (
      this.assets.leaves.has(this.id) ||
      (this.lastFrame === frame && this.lastAge === age && this.renderedPose === pose)
    )
      return;
    this.renderedPose = pose;
    this.lastFrame = frame;
    this.lastAge = age;
    const placements = pose?.placements ?? this.assets.displayList(this.id, frame),
      active = new Set(placements.map((p) => p.depth));
    for (const [depth, child] of this.children)
      if (!active.has(depth)) {
        child.view.destroy();
        this.children.delete(depth);
      }
    const masks: { depth: number; end: number; view: SwfSymbolView }[] = [];
    for (const p of placements) {
      const childPose = pose?.children.get(p.depth)?.clip;
      let node = this.children.get(p.depth);
      if (!node || node.id !== p.charId || (pose && node.pose !== childPose)) {
        node?.view.destroy();
        const view = new SwfSymbolView(p.charId, this.assets, this.textures);
        node = { id: p.charId, view, color: '', pose: childPose };
        this.children.set(p.depth, node);
        this.root.addChild(view.root);
      }
      const m = p.matrix;
      node.view.root.setFromMatrix(this.matrix.set(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20));
      const color = JSON.stringify(p.color ?? null);
      if (color !== node.color) {
        node.view.setColor(p);
        node.color = color;
      }
      this.root.setChildIndex(node.view.root, this.root.children.length - 1);
      if (childPose) node.view.updatePose(childPose, p.ratio ?? 0);
      else if (node.view.root.visible)
        node.view.update(
          held ? Math.max(1, age) : this.assets.childAge(this.id, age, p),
          undefined,
          p.ratio ?? 0,
        );
      node.view.root.mask =
        masks.findLast((mask) => p.depth > mask.depth && p.depth <= mask.end)?.view.root ?? null;
      if (p.clipDepth !== undefined)
        masks.push({ depth: p.depth, end: p.clipDepth, view: node.view });
    }
  }
  gotoAndPlay(frame: number, y = this.root.y) {
    if (!this.ownedPose) return;
    this.ownedPose.gotoAndPlay(frame, y);
    this.lastFrame = -1;
    this.updatePose(this.ownedPose);
  }
  hitTest(x: number, y: number): boolean {
    return this.renderedPose ? this.assets.hitClip(this.renderedPose, x, y) : false;
  }
  namedChild(name: string): SwfSymbolView | undefined {
    const placement = this.assets.displayList(this.id, this.lastFrame).find((p) => p.name === name);
    return placement ? this.children.get(placement.depth)?.view : undefined;
  }
  private setColor(p: DisplayPlacement) {
    this.colorFilter?.destroy();
    this.colorFilter = null;
    this.root.filters = null;
    if (!p.color) {
      this.root.alpha = 1;
      this.root.visible = true;
      return;
    }
    const { mult: m, add: a } = p.color;
    this.root.visible = m[3] !== 0 || a[3] !== 0;
    if (m.slice(0, 3).every((n) => n === 1) && a.every((n) => n === 0)) {
      this.root.alpha = m[3];
      return;
    }
    this.root.alpha = 1;
    const f = new ColorMatrixFilter();
    f.matrix = [
      m[0],
      0,
      0,
      0,
      a[0] / 255,
      0,
      m[1],
      0,
      0,
      a[1] / 255,
      0,
      0,
      m[2],
      0,
      a[2] / 255,
      0,
      0,
      0,
      m[3],
      a[3] / 255,
    ];
    this.colorFilter = f;
    this.root.filters = [f];
  }
  destroy() {
    if (this.morphRaster) {
      this.textures.release(this.morphRaster);
      this.morphRaster = null;
    }
    for (const child of this.children.values()) child.view.destroy();
    this.children.clear();
    this.colorFilter?.destroy();
    if (!this.root.destroyed) this.root.destroy({ children: true });
  }
}
