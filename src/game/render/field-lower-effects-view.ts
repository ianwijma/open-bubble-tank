import { Container, Graphics, Matrix, Sprite } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { Field } from '../core/types';
import type { FieldDisplayRead } from '../simulation/field-display';
import type { FieldTransform } from './field-transform';
import type { RasterTextures } from './swf-symbol-view';

export interface LowerEffectMaskPaint {
  readonly field: Field;
  readonly read: FieldDisplayRead;
  readonly transform: FieldTransform;
}

/** Projection of1551's depth4 mask over depth6 lower effects only.
 * Content already has its actual117→field→World transform; this mask follows
 * its independent authored slot, including its different collapse scaling.
 */
export class FieldLowerEffectsView {
  readonly root = new Container();
  readonly content = new Container();
  readonly maskSlot = new Container();
  private readonly instances: number[];
  private readonly matrix = new Matrix();
  constructor(read: FieldDisplayRead, assets: AssetPack, textures: RasterTextures) {
    this.instances = [read.root.id, read.slots.underMask.id, read.bottom.id];
    this.root.addChild(this.maskSlot, this.content);
    if (assets.mode === 'mock') {
      const mask = new Graphics().circle(0, 0, 423.75).fill(0xffffff);
      this.maskSlot.addChild(mask);
      this.content.mask = mask;
      return;
    }
    const placements = assets.displayList(read.slots.underMask.symbol, 1);
    const p = placements[0];
    if (
      placements.length !== 1 ||
      p?.charId !== 1538 ||
      p.matrix.a !== 1 ||
      p.matrix.d !== 1 ||
      p.matrix.b !== 0 ||
      p.matrix.c !== 0 ||
      p.matrix.tx !== 0 ||
      p.matrix.ty !== 0
    )
      throw new Error('Unsupported native lower-effect mask placement');
    const raster = assets.leaves.get(1538);
    if (!raster) throw new Error('Missing runtime lower-effect mask artwork');
    const mask = new Sprite(textures.get(raster));
    mask.position.set(raster.x, raster.y);
    mask.width = raster.width;
    mask.height = raster.height;
    this.maskSlot.addChild(mask);
    this.content.setMask({ mask, channel: 'alpha' });
  }
  update({ read, transform }: LowerEffectMaskPaint) {
    if (
      [read.root.id, read.slots.underMask.id, read.bottom.id].some(
        (id, i) => id !== this.instances[i],
      )
    )
      throw new Error('Changed retained lower-effect mask instance');
    const m = transform.matrix!;
    this.maskSlot.setFromMatrix(this.matrix.set(m.a, m.b, m.c, m.d, m.tx / 20, m.ty / 20));
    this.root.visible = read.root.rooted && read.bottom.parent !== null;
  }
  destroy() {
    this.content.mask = null;
    this.root.destroy({ children: true });
  }
}
