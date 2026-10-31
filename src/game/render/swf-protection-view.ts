import { Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Tank, TankChild } from '../core/types';
import { partById } from '../data/catalog';
import { PROTECTION_ART } from '../data/status-art';
import { protectionScale } from '../core/protection-size';
import { legacyShieldFilm } from '../core/shield-art';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** AGunShield/_-DO display clips and APassiveForcefield's cloned-tank silhouette mask. */
export class SwfProtectionView {
  root = new Container();
  private shield?: SwfSymbolView;
  private hit?: SwfSymbolView;
  private mounted = new Map<TankChild, SwfSymbolView>();
  private field?: SwfSymbolView;
  private fieldMask?: Container;
  private fieldGeneration = -1;
  private maskParts: { view: SwfSymbolView; part: Tank['design']['parts'][number] }[] = [];
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {}
  private view(id: number, width: number, uniform = false) {
    const view = new SwfSymbolView(id, this.assets, this.textures);
    view.update(1);
    this.size(view, width, uniform);
    this.root.addChild(view.root);
    return view;
  }
  private size(view: SwfSymbolView, width: number, uniform = false) {
    const bounds = this.assets.symbolScriptBounds(view.id);
    const scale = protectionScale(bounds, width, uniform);
    view.root.scale.set(scale.x, scale.y);
  }
  update(tank: Tank) {
    const attached = new Set<TankChild>(tank.shieldClips.map((clip) => clip.key));
    for (const [key, view] of this.mounted) {
      if (attached.has(key)) continue;
      view.destroy();
      this.mounted.delete(key);
    }
    for (const clip of tank.shieldClips) {
      let view = this.mounted.get(clip.key);
      if (!view) {
        view = this.view(
          clip.kind === 'film' ? PROTECTION_ART.shield : PROTECTION_ART.shieldHit,
          clip.diameter,
        );
        this.mounted.set(clip.key, view);
      }
      view.root.visible = tank.displayChildren.includes(clip.key);
      view.setParentAlpha(tank.alpha);
      view.update(clip.kind === 'hit' ? Math.min(16, clip.age + 1) : clip.age + 1);
      view.root.angle = clip.angle;
    }
    if (legacyShieldFilm(tank)) {
      const turret = tank.side !== 'player';
      const diameter = turret
        ? tank.radius * 2
        : (tank.shieldDiameter ?? this.assets.protectionRadius(tank) * 2);
      this.shield ??= this.view(
        turret ? PROTECTION_ART.turretShield : PROTECTION_ART.shield,
        diameter,
      );
      this.hit ??= this.view(
        turret ? PROTECTION_ART.turretShieldHit : PROTECTION_ART.shieldHit,
        tank.shieldHitDiameter ?? diameter,
      );
      this.size(this.shield, diameter);
      this.size(this.hit, tank.shieldHitDiameter ?? diameter);
      this.shield.root.visible = this.hit.root.visible = true;
      this.shield.setParentAlpha(tank.alpha);
      this.shield.update(turret ? Math.min(25, tank.shieldAge + 1) : tank.shieldAge + 1);
    } else {
      if (this.shield) this.shield.root.visible = false;
    }
    if (this.hit) {
      // KillShield removes the film only; its attached hit clip finishes independently.
      this.hit.root.visible = true;
      this.hit.setParentAlpha(tank.alpha);
      this.hit.update(Math.min(16, tank.shieldHitAge + 1));
      this.hit.root.angle = tank.shieldHitAngle;
    }
    if (tank.design.parts.some((part) => part.type === 5005)) {
      if (!tank.forcefieldAttached) {
        if (this.field) this.field.root.visible = false;
        return;
      }
      if (this.field && this.fieldGeneration !== tank.forcefieldGeneration) {
        this.field.root.mask = null;
        this.field.destroy();
        for (const { view } of this.maskParts) view.destroy();
        this.fieldMask?.destroy({ children: true });
        this.field = undefined;
        this.fieldMask = undefined;
        this.maskParts = [];
      }
      if (!this.field) {
        this.fieldGeneration = tank.forcefieldGeneration;
        this.field = this.view(
          PROTECTION_ART.forcefield,
          this.assets.forcefieldRadius(tank) * 2.1,
          true,
        );
        this.fieldMask = new Container();
        this.root.addChild(this.fieldMask);
        // Each Setup clones the complete design; degradation and aimed gun rotations
        // on the live tank do not change that silhouette.
        for (const part of tank.design.parts) {
          const id = partById(part.type)?.symbol;
          if (!id) continue;
          const view = new SwfSymbolView(id, this.assets, this.textures);
          view.root.position.set(part.x, part.y);
          view.root.scale.set(part.scale);
          view.root.angle = part.rotation;
          this.fieldMask.addChild(view.root);
          this.maskParts.push({ view, part });
        }
        this.field.root.mask = this.fieldMask;
      }
      this.field.root.visible = true;
      for (const { view, part } of this.maskParts)
        view.updatePose(this.assets.forcefieldPartClip(tank, part));
      this.field.setParentAlpha(tank.alpha);
      this.field.update(tank.artAge - tank.forcefieldStartedAt + 1, tank.forcefieldFrame);
      this.field.root.angle = tank.forcefieldAngle;
    }
  }
  /** The splash and its silhouette mask move together as one source wrapper. */
  displayEntries(): [TankChild, Container][] {
    const entries: [TankChild, Container][] = [];
    if (this.hit) entries.push(['shield-hit', this.hit.root]);
    if (this.shield) entries.push(['shield-film', this.shield.root]);
    for (const [key, view] of this.mounted) entries.push([key, view.root]);
    if (this.field) entries.push(['forcefield', this.field.root]);
    if (this.fieldMask) entries.push(['forcefield', this.fieldMask]);
    return entries;
  }
  destroy() {
    this.shield?.destroy();
    this.hit?.destroy();
    for (const view of this.mounted.values()) view.destroy();
    this.field?.destroy();
    for (const { view } of this.maskParts) view.destroy();
    this.root.destroy({ children: true });
  }
}
