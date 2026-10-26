import { Container, Graphics, Sprite } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Tank, TankDesign } from '../core/types';
import { partById } from '../data/catalog';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';
import { SwfTankStatusView } from './swf-tank-status-view';
import { SwfProtectionView } from './swf-protection-view';

/** Shared live pose for the world and tank-information portrait. No simulation clocks advance here. */
export class TankView {
  container = new Container();
  private parts: { root: Container; animation?: SwfSymbolView }[];
  private shield = new Graphics();
  private status?: SwfTankStatusView;
  private protection?: SwfProtectionView;
  constructor(
    readonly design: TankDesign,
    private assets: AssetPack,
    textures: RasterTextures,
  ) {
    this.parts = design.parts.map((p) => {
      const root = new Container(),
        symbol = partById(p.type)?.symbol;
      let animation: SwfSymbolView | undefined;
      if (assets.mode === 'swf' && symbol) {
        animation = new SwfSymbolView(symbol, assets, textures);
        root.addChild(animation.root);
      } else {
        const raster = assets.part(p.type),
          sprite = new Sprite(textures.get(raster));
        sprite.position.set(raster.x, raster.y);
        sprite.width = raster.width;
        sprite.height = raster.height;
        root.addChild(sprite);
      }
      root.position.set(p.x, p.y);
      root.scale.set(p.scale);
      this.container.addChild(root);
      return { root, animation };
    });
    this.container.addChild(this.shield);
    if (assets.mode === 'swf') {
      this.status = new SwfTankStatusView(assets, textures);
      this.protection = new SwfProtectionView(assets, textures);
      this.container.addChild(this.status.root, this.protection.root);
    }
  }
  update(t: Tank) {
    this.container.angle = t.rotation;
    this.container.alpha = t.alpha;
    for (const [i, part] of t.design.parts.entries()) {
      const view = this.parts[i];
      view.root.visible = !t.hiddenParts.has(part.key) && !t.removedParts.has(part.key);
      view.root.angle = t.guns.find((g) => g.part.key === part.key)?.angle ?? part.rotation;
      if (view.root.visible) view.animation?.updatePose(this.assets.partClip(t, part));
    }
    this.shield.clear();
    if (
      !this.protection &&
      (t.shield > 0 || (t.design.parts.some((p) => p.type === 5005) && t.forcefieldReady))
    )
      this.shield
        .circle(0, 0, t.radius + 6)
        .fill({ color: 0xaaddff, alpha: 0.07 })
        .stroke({ color: 0xbbeeff, alpha: 0.65, width: 1.5 });
    this.status?.update(t);
    this.protection?.update(t);
    this.container.filters = this.status?.infectionFilter ? [this.status.infectionFilter] : null;
    if (!this.status && t.status.stun > 0)
      this.shield.star(0, -t.radius - 6, 5, 5, 2).fill(0xffffff);
    if (this.status) this.container.tint = 0xffffff;
    else if (t.status.infect > 0) this.container.tint = 0xb1ed80;
    else if (t.status.sticky > 0) this.container.tint = 0xbbb0ff;
    else this.container.tint = 0xffffff;
  }
  destroy() {
    this.container.filters = null;
    this.status?.destroy();
    this.protection?.destroy();
    for (const part of this.parts) part.animation?.destroy();
    this.container.destroy({ children: true });
  }
}
