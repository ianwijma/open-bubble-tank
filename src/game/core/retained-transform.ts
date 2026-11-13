import { DISPLAY_IDENTITY, type DisplayMatrix } from './display-transform';
import { displayAlpha, displayRotation, displayTwips } from './display-values';

export type PoseProperty = 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation' | 'alpha';
export interface NumericPose {
  readonly matrix: Readonly<DisplayMatrix>;
  readonly x: number;
  readonly y: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly alpha: number;
}
const unit = (value: number) => (value * 100) / 100;
const degrees = 180 / Math.PI;
const radians = Math.PI / 180;

/**
 * Finite field lifecycle setters: cached Number scale/rotation, float32 matrix
 * columns and truncating position writes. Pinned Ruffle v0.7.1 display_object.rs
 * 490–627 / types.rs: Percent stores unit*100, then exposes percent/100.
 * This is not a width/height setter or a geometric bounds approximation.
 */
export class RetainedTransform {
  private matrix: DisplayMatrix;
  private sx: number;
  private sy: number;
  private angle: number;
  private skew: number;
  private opacity: number;
  constructor(
    matrix: Readonly<DisplayMatrix> = DISPLAY_IDENTITY,
    alpha = 1,
    private readonly changed: (property: PoseProperty, value: number) => void = () => {},
  ) {
    this.matrix = { ...matrix };
    const rotation = Math.atan2(matrix.b, matrix.a);
    this.sx = unit(Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b));
    this.sy = unit(Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d));
    this.angle = rotation * degrees;
    this.skew = Math.atan2(-matrix.c, matrix.d) - rotation;
    this.opacity = alpha;
  }
  get x() {
    return this.matrix.tx / 20;
  }
  get y() {
    return this.matrix.ty / 20;
  }
  get scaleX() {
    return this.sx;
  }
  get scaleY() {
    return this.sy;
  }
  get rotation() {
    return this.angle;
  }
  set x(value: number) {
    this.matrix.tx = displayTwips(value);
    this.changed('x', value);
  }
  set y(value: number) {
    this.matrix.ty = displayTwips(value);
    this.changed('y', value);
  }
  set scaleX(value: number) {
    this.sx = unit(value);
    const angle = this.angle * radians;
    this.matrix.a = Math.fround(Math.cos(angle) * this.sx);
    this.matrix.b = Math.fround(Math.sin(angle) * this.sx);
    this.changed('scaleX', value);
  }
  set scaleY(value: number) {
    this.sy = unit(value);
    const angle = this.angle * radians + this.skew;
    this.matrix.c = Math.fround(-Math.sin(angle) * this.sy);
    this.matrix.d = Math.fround(Math.cos(angle) * this.sy);
    this.changed('scaleY', value);
  }
  set rotation(value: number) {
    this.angle = displayRotation(value);
    const x = this.angle * radians,
      y = x + this.skew;
    this.matrix.a = Math.fround(this.sx * Math.cos(x));
    this.matrix.b = Math.fround(this.sx * Math.sin(x));
    this.matrix.c = Math.fround(-this.sy * Math.sin(y));
    this.matrix.d = Math.fround(this.sy * Math.cos(y));
    this.changed('rotation', value);
  }
  set alpha(value: number) {
    this.opacity = displayAlpha(value);
    this.changed('alpha', value);
  }
  read(): NumericPose {
    return Object.freeze({
      matrix: Object.freeze({ ...this.matrix }),
      x: this.x,
      y: this.y,
      scaleX: this.sx,
      scaleY: this.sy,
      rotation: this.angle,
      alpha: this.opacity,
    });
  }
}
