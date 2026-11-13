import { Container, Graphics, Sprite } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Tank, TankChild, TankDesign } from '../core/types';
import { partById } from '../data/catalog';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';
import { SwfTankStatusView } from './swf-tank-status-view';
import { SwfProtectionView } from './swf-protection-view';

/** Shared live pose for the world and tank-information portrait. No simulation clocks advance here. */
export class TankView {
  container = new Container();
  private parts: { root: Container; animation?: SwfSymbolView; sprite?: Sprite }[];
  private shield = new Graphics();
  private mockStatus = new Graphics();
  private mountedShields = new Map<TankChild, Graphics>();
  private status?: SwfTankStatusView;
  private protection?: SwfProtectionView;
  constructor(
    readonly design: TankDesign,
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {
    this.parts = design.parts.map((p) => {
      const root = new Container(),
        symbol = partById(p.type)?.symbol;
      let animation: SwfSymbolView | undefined, sprite: Sprite | undefined;
      if (assets.hasPartTimeline(p.type) && symbol) {
        animation = new SwfSymbolView(symbol, assets, textures);
        root.addChild(animation.root);
      } else {
        const raster = assets.part(p.type);
        sprite = new Sprite(textures.get(raster));
        sprite.position.set(raster.x, raster.y);
        sprite.width = raster.width;
        sprite.height = raster.height;
        root.addChild(sprite);
      }
      root.position.set(p.x, p.y);
      root.scale.set(p.scale);
      return { root, animation, sprite };
    });
    if (assets.mode === 'swf') {
      this.status = new SwfTankStatusView(assets, textures);
      this.protection = new SwfProtectionView(assets, textures);
    }
  }
  update(t: Tank) {
    this.container.angle = t.rotation;
    this.container.alpha = 1;
    this.shield.alpha = t.alpha;
    for (const [i, part] of t.design.parts.entries()) {
      const view = this.parts[i];
      view.root.visible =
        t.displayChildren.includes(`part:${part.key}`) &&
        !t.hiddenParts.has(part.key) &&
        !t.removedParts.has(part.key);
      view.root.angle = t.guns.find((g) => g.part.key === part.key)?.angle ?? part.rotation;
      if (view.root.visible) {
        view.animation?.setParentAlpha(t.alpha);
        view.animation?.updatePose(this.assets.partClip(t, part));
        if (view.sprite) {
          view.sprite.alpha = t.alpha;
          const raster = this.assets.livePart(t, part);
          view.sprite.texture = this.textures.get(raster);
          view.sprite.position.set(raster.x, raster.y);
          view.sprite.width = raster.width;
          view.sprite.height = raster.height;
        }
        // Editor leaves keep the shared source gold; hostile live mounts get a mild warm tint.
        view.root.tint =
          this.assets.mode === 'mock' && t.side === 'enemy' && part.type >= 2000
            ? 0xffe6cc
            : 0xffffff;
      }
    }
    this.shield.clear();
    const shieldFilm = t.displayChildren.includes('shield-film');
    if (!this.protection) {
      const films = t.shieldClips.filter((clip) => clip.kind === 'film');
      const keys = new Set<TankChild>(films.map((clip) => clip.key));
      for (const [key, view] of this.mountedShields)
        if (!keys.has(key)) {
          view.destroy();
          this.mountedShields.delete(key);
        }
      for (const clip of films) {
        let view = this.mountedShields.get(clip.key);
        if (!view) {
          view = new Graphics();
          view
            .circle(0, 0, Number.isNaN(clip.diameter) ? 65 : clip.diameter / 2)
            .fill({ color: 0xaaddff, alpha: 0.07 })
            .stroke({ color: 0xbbeeff, alpha: 0.65, width: 1.5 });
          this.mountedShields.set(clip.key, view);
        }
        view.alpha = t.alpha;
        view.visible = t.displayChildren.includes(clip.key);
      }
    }
    if (
      !this.protection &&
      (shieldFilm ||
        (t.design.parts.some((p) => p.type === 5005) &&
          t.forcefieldReady &&
          t.forcefieldAttached &&
          t.displayChildren.includes('forcefield')))
    ) {
      const diameter = shieldFilm
        ? t.side === 'player'
          ? (t.shieldDiameter ?? this.assets.protectionRadius(t) * 2)
          : t.radius * 2
        : this.assets.forcefieldRadius(t) * 2.1;
      this.shield
        .circle(0, 0, Number.isNaN(diameter) ? 65 : diameter / 2)
        .fill({ color: 0xaaddff, alpha: 0.07 })
        .stroke({ color: 0xbbeeff, alpha: 0.65, width: 1.5 });
    }
    this.status?.update(t);
    this.protection?.update(t);
    this.orderChildren(t);
    this.container.filters = this.status?.infectionFilter ? [this.status.infectionFilter] : null;
    this.mockStatus.clear();
    if (!this.status && t.displayChildren.includes('status') && t.status.stun > 0)
      this.mockStatus.star(0, -t.radius - 6, 5, 5, 2).fill(0xffffff);
    if (this.status) this.container.tint = 0xffffff;
    else if (t.displayChildren.includes('infection') && t.status.infect > 0)
      this.container.tint = 0xb1ed80;
    else if (t.displayChildren.includes('status') && t.status.sticky > 0)
      this.container.tint = 0xbbb0ff;
    else this.container.tint = 0xffffff;
  }
  private orderChildren(tank: Tank) {
    const entries: [TankChild, Container][] = this.parts.map((view, i) => [
      `part:${tank.design.parts[i].key}`,
      view.root,
    ]);
    entries.push(...(this.status?.displayEntries() ?? []));
    entries.push(...(this.protection?.displayEntries() ?? []));
    entries.push(...this.mountedShields);
    if (!this.protection)
      entries.push(
        [tank.displayChildren.includes('shield-film') ? 'shield-film' : 'forcefield', this.shield],
        ['status', this.mockStatus],
      );
    // Absence means removeChild, not an implicit last-place entry. Keep detached
    // part/clip views available for explicit reattachment of the same identity.
    const attached = new Set(tank.displayChildren);
    for (const [key, child] of entries)
      if (!attached.has(key) && child.parent === this.container) this.container.removeChild(child);
    let index = 0;
    for (const key of tank.displayChildren)
      for (const [entryKey, child] of entries) {
        if (key !== entryKey) continue;
        child.label = key;
        if (child.parent !== this.container) this.container.addChildAt(child, index);
        else if (this.container.getChildIndex(child) !== index)
          this.container.setChildIndex(child, index);
        index++;
      }
  }
  destroy() {
    this.container.filters = null;
    this.status?.destroy();
    this.protection?.destroy();
    for (const part of this.parts) {
      part.animation?.destroy();
      part.root.destroy({ children: true });
    }
    this.shield.destroy();
    this.mockStatus.destroy();
    for (const view of this.mountedShields.values()) view.destroy();
    this.mountedShields.clear();
    this.container.destroy({ children: true });
  }
}
