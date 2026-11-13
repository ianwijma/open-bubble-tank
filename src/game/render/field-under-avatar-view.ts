import { Container, Graphics, Matrix, Sprite } from 'pixi.js';
import type { AssetPack } from '../assets/asset-pack';
import type { DisplayMatrix } from '../core/display-transform';
import type { FieldDisplayRead } from '../simulation/field-display';
import type { FieldTransform } from './field-transform';
import type { SwfTextures } from './swf-textures';

/** Original1551 depth10/12 branch only. No actor/life child inherits this mask.
 * Model instances survive detachment; projections use their actual retained owners.
 * Finite original paint controls qualify alpha masking, not pixel/Adobe equality.
 */
export class FieldUnderAvatarView {
  readonly root = new Container();
  readonly under = new Container();
  readonly maskSlot = new Container();
  readonly instance: number;
  readonly underInstance: number;
  readonly maskInstance: number;
  private matrix = new Matrix();
  constructor(read: FieldDisplayRead, assets: AssetPack, textures: SwfTextures) {
    this.instance = read.root.id;
    this.underInstance = read.slots.avatarUnder.id;
    this.maskInstance = read.slots.exteriorMask.id;
    this.root.addChild(this.maskSlot, this.under);
    if (assets.mode === 'mock') {
      // Procedural approximation only: the native exterior contour has a slit.
      // Keep that approximation out of native paint and all geometric queries.
      const mask = new Graphics()
        .rect(-1000, -1000, 2000, 2000)
        .fill(0xffffff)
        .circle(0, 0, 425)
        .cut();
      this.maskSlot.addChild(mask);
      this.under.addChild(
        new Graphics().circle(0, 0, 50).fill(0xbbd9f2).stroke({ color: 0xffffff, width: 1 }),
      );
      this.under.mask = mask;
      return;
    }
    // The imported/qualified branch has one identity-placed leaf per slot.
    // Use the runtime-supplied artwork, including1541's exterior contour/slit.
    const leaf = (symbol: number, expected: number) => {
      const placements = assets.displayList(symbol, 1);
      const placement = placements[0];
      if (
        placements.length !== 1 ||
        placement?.charId !== expected ||
        placement.matrix.a !== 1 ||
        placement.matrix.d !== 1 ||
        placement.matrix.b !== 0 ||
        placement.matrix.c !== 0 ||
        placement.matrix.tx !== 0 ||
        placement.matrix.ty !== 0
      )
        throw new Error('Unsupported under-avatar native leaf placement');
      const raster = assets.leaves.get(expected);
      if (!raster) throw new Error('Missing runtime under-avatar artwork');
      const sprite = new Sprite(textures.get(raster));
      sprite.position.set(raster.x, raster.y);
      sprite.width = raster.width;
      sprite.height = raster.height;
      return sprite;
    };
    const mask = leaf(read.slots.exteriorMask.symbol, 1541);
    this.maskSlot.addChild(mask);
    this.under.addChild(leaf(read.slots.avatarUnder.symbol, 1543));
    // Shape1541 is green. Pixi's default red channel would reduce opaque paint.
    // Original BitmapData controls distinguish that failure from alpha coverage.
    this.under.setMask({ mask, channel: 'alpha' });
  }
  private pose(container: Container, matrix: Readonly<DisplayMatrix>) {
    container.setFromMatrix(
      this.matrix.set(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx / 20, matrix.ty / 20),
    );
  }
  update(read: FieldDisplayRead, transform: FieldTransform) {
    if (
      read.root.id !== this.instance ||
      read.slots.avatarUnder.id !== this.underInstance ||
      read.slots.exteriorMask.id !== this.maskInstance
    )
      throw new Error('Changed retained under-avatar instance');
    this.root.visible = read.root.rooted;
    this.root.alpha = read.root.pose.alpha;
    this.pose(this.root, transform.matrix!);
    this.pose(this.under, read.slots.avatarUnder.pose.matrix);
    this.under.alpha = read.slots.avatarUnder.pose.alpha;
    this.pose(this.maskSlot, read.slots.exteriorMask.pose.matrix);
  }
  destroy() {
    this.under.mask = null;
    this.root.destroy({ children: true });
  }
}
