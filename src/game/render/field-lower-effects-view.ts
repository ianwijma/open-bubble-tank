import { Container, Graphics, Matrix } from 'pixi.js';
import type { Field } from '../core/types';
import type { FieldDisplayRead } from '../simulation/field-display';
import type { FieldTransform } from './field-transform';

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
  constructor(read: FieldDisplayRead) {
    this.instances = [read.root.id, read.slots.underMask.id, read.bottom.id];
    this.root.addChild(this.maskSlot, this.content);
    const mask = new Graphics().circle(0, 0, 423.75).fill(0xffffff);
    this.maskSlot.addChild(mask);
    this.content.mask = mask;
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
