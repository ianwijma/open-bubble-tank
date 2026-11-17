import { Container, Graphics, Matrix } from 'pixi.js';
import type { DisplayMatrix } from '../core/display-transform';
import type { FieldDisplayRead } from '../simulation/field-display';
import type { FieldTransform } from './field-transform';

/** The 1551 depth10/12 branch only. No actor/life child inherits this mask.
 * Model instances survive detachment; projections use their actual retained owners.
 * Finite paint controls qualify alpha masking, not pixel equality.
 */
export class FieldUnderAvatarView {
  readonly root = new Container();
  readonly under = new Container();
  readonly maskSlot = new Container();
  readonly instance: number;
  readonly underInstance: number;
  readonly maskInstance: number;
  private matrix = new Matrix();
  constructor(read: FieldDisplayRead) {
    this.instance = read.root.id;
    this.underInstance = read.slots.avatarUnder.id;
    this.maskInstance = read.slots.exteriorMask.id;
    this.root.addChild(this.maskSlot, this.under);
    // Procedural approximation only: the authored exterior contour has a slit.
    // Keep that approximation out of authored paint and all geometric queries.
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
