import { Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Tank, TankChild } from '../core/types';
import { partById } from '../data/catalog';
import { PROTECTION_ART } from '../data/status-art';
import { SwfSymbolView, type RasterTextures } from './swf-symbol-view';

/** AGunShield/_-DO display clips and APassiveForcefield's cloned-tank silhouette mask. */
export class SwfProtectionView {
  root = new Container();
  private shield?: SwfSymbolView;
  private hit?: SwfSymbolView;
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
    view.root.scale.set(1);
    // Flash ignores NaN/negative size assignments, retaining authored scale.
    if (bounds && width >= 0)
      view.root.scale.set(
        bounds.width ? width / bounds.width : 1,
        uniform
          ? bounds.width
            ? width / bounds.width
            : 1
          : bounds.height
            ? width / bounds.height
            : 1,
      );
  }
  update(tank: Tank) {
    if (tank.shield > 0 || tank.displayChildren.includes('shield-film')) {
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
    if (this.field) entries.push(['forcefield', this.field.root]);
    if (this.fieldMask) entries.push(['forcefield', this.fieldMask]);
    return entries;
  }
  destroy() {
    this.shield?.destroy();
    this.hit?.destroy();
    this.field?.destroy();
    for (const { view } of this.maskParts) view.destroy();
    this.root.destroy({ children: true });
  }
}
