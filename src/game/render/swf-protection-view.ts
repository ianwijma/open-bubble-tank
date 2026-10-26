import { Container } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Tank } from '../core/types';
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
  private maskParts: SwfSymbolView[] = [];
  constructor(
    private assets: AssetPack,
    private textures: RasterTextures,
  ) {}
  private view(id: number, width: number) {
    const view = new SwfSymbolView(id, this.assets, this.textures);
    view.update(1);
    const bounds = this.assets.symbolBounds(id);
    if (bounds)
      view.root.scale.set(width / Math.max(1, bounds.width), width / Math.max(1, bounds.height));
    this.root.addChild(view.root);
    return view;
  }
  update(tank: Tank) {
    if (tank.shield > 0) {
      const turret = tank.side !== 'player';
      this.shield ??= this.view(
        turret ? PROTECTION_ART.turretShield : PROTECTION_ART.shield,
        tank.radius * 2,
      );
      this.hit ??= this.view(
        turret ? PROTECTION_ART.turretShieldHit : PROTECTION_ART.shieldHit,
        tank.radius * 2,
      );
      this.shield.root.visible = this.hit.root.visible = true;
      this.shield.update(turret ? Math.min(25, tank.shieldAge + 1) : tank.shieldAge + 1);
      this.hit.update(Math.min(16, tank.shieldHitAge + 1));
      this.hit.root.angle = tank.shieldHitAngle;
    } else {
      if (this.shield) this.shield.root.visible = false;
      if (this.hit) this.hit.root.visible = false;
    }
    if (tank.design.parts.some((part) => part.type === 5005)) {
      if (!this.field) {
        this.field = this.view(PROTECTION_ART.forcefield, tank.radius * 2.1);
        this.fieldMask = new Container();
        this.root.addChild(this.fieldMask);
        // The source clones the complete design once; degradation and aimed gun rotations
        // on the live tank do not change that silhouette.
        for (const part of tank.design.parts) {
          const id = partById(part.type)?.symbol;
          if (!id) continue;
          const view = new SwfSymbolView(id, this.assets, this.textures, { random: Math.random });
          view.root.position.set(part.x, part.y);
          view.root.scale.set(part.scale);
          view.root.angle = part.rotation;
          this.fieldMask.addChild(view.root);
          this.maskParts.push(view);
        }
        this.field.root.mask = this.fieldMask;
      }
      for (const part of this.maskParts) part.update(tank.age + 1);
      this.field.update(tank.age + 1, tank.forcefieldFrame);
      this.field.root.angle = tank.forcefieldAngle;
    }
  }
  destroy() {
    this.shield?.destroy();
    this.hit?.destroy();
    this.field?.destroy();
    for (const part of this.maskParts) part.destroy();
    this.root.destroy({ children: true });
  }
}
