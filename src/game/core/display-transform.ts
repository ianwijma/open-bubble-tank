import type { Vec } from './types';
import { displayTwips } from './display-values';

/** Float32 coefficients, signed integer twip translations and points. */
export interface DisplayMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}
export const DISPLAY_IDENTITY: Readonly<DisplayMatrix> = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  tx: 0,
  ty: 0,
};
const f = Math.fround;
const add = (a: number, b: number) => f(f(a) + f(b));
const subtract = (a: number, b: number) => f(f(a) - f(b));
const multiply = (a: number, b: number) => f(f(a) * f(b));
const divide = (a: number, b: number) => f(f(a) / f(b));

/** Matrix products use nearest/ties-even, unlike DisplayObject position setters. */
function roundedTwip(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value >= 2147483648 || value <= -2147483648) return -2147483648;
  const lower = Math.floor(value),
    fraction = value - lower;
  return fraction < 0.5 ? lower : fraction > 0.5 ? lower + 1 : lower % 2 === 0 ? lower : lower + 1;
}
export function displayMatrixProduct(
  left: Readonly<DisplayMatrix>,
  right: Readonly<DisplayMatrix>,
): DisplayMatrix {
  return {
    a: add(multiply(left.a, right.a), multiply(left.c, right.b)),
    b: add(multiply(left.b, right.a), multiply(left.d, right.b)),
    c: add(multiply(left.a, right.c), multiply(left.c, right.d)),
    d: add(multiply(left.b, right.c), multiply(left.d, right.d)),
    tx: (roundedTwip(add(multiply(left.a, right.tx), multiply(left.c, right.ty))) + left.tx) | 0,
    ty: (roundedTwip(add(multiply(left.b, right.tx), multiply(left.d, right.ty))) + left.ty) | 0,
  };
}
export function displayMatrixPoint(matrix: Readonly<DisplayMatrix>, point: Vec): Vec {
  return {
    x: (roundedTwip(add(multiply(matrix.a, point.x), multiply(matrix.c, point.y))) + matrix.tx) | 0,
    y: (roundedTwip(add(multiply(matrix.b, point.x), multiply(matrix.d, point.y))) + matrix.ty) | 0,
  };
}

/** Declared integer twips, before any pixel conversion or raster padding. */
export interface DisplayRectangle {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** Script bounds transform each corner with the same arithmetic as a display Point. */
export function displayMatrixRectangle(
  matrix: Readonly<DisplayMatrix>,
  rectangle: Readonly<DisplayRectangle>,
): DisplayRectangle {
  const points = [
    { x: rectangle.xMin, y: rectangle.yMin },
    { x: rectangle.xMin, y: rectangle.yMax },
    { x: rectangle.xMax, y: rectangle.yMin },
    { x: rectangle.xMax, y: rectangle.yMax },
  ].map((point) => displayMatrixPoint(matrix, point));
  return {
    xMin: Math.min(...points.map((point) => point.x)),
    yMin: Math.min(...points.map((point) => point.y)),
    xMax: Math.max(...points.map((point) => point.x)),
    yMax: Math.max(...points.map((point) => point.y)),
  };
}
export function inverseDisplayMatrix(matrix: Readonly<DisplayMatrix>): DisplayMatrix | null {
  const det = subtract(multiply(matrix.a, matrix.d), multiply(matrix.b, matrix.c));
  if (!(Math.abs(det) > 2 ** -23)) return null;
  return {
    a: divide(matrix.d, det),
    b: divide(matrix.b, -det),
    c: divide(matrix.c, -det),
    d: divide(matrix.a, det),
    tx: roundedTwip(
      divide(subtract(multiply(matrix.d, matrix.tx), multiply(matrix.c, matrix.ty)), -det),
    ),
    ty: roundedTwip(
      divide(subtract(multiply(matrix.b, matrix.tx), multiply(matrix.a, matrix.ty)), det),
    ),
  };
}
const fromPixels = (point: Vec): Vec => ({ x: displayTwips(point.x), y: displayTwips(point.y) });
const toPixels = (point: Vec): Vec => ({ x: point.x / 20, y: point.y / 20 });
const scaleMatrix = (scale: number): DisplayMatrix => ({
  ...DISPLAY_IDENTITY,
  a: f(scale),
  d: f(scale),
});

/**
 * Physical player pixels → event target local → stageX/Y → reference local.
 * Ruffle local_mouse_position rounds in device pixels before returning twips;
 * the two ActionScript Point conversions retain their own truncating writes.
 * No DOM reads, saved-design mutation or rounding at serialization time.
 */
export function displayMousePoint(
  physicalPixels: Vec,
  viewport: Readonly<DisplayMatrix>,
  target: Readonly<DisplayMatrix>,
  reference: Readonly<DisplayMatrix>,
): Vec {
  const inverseView = inverseDisplayMatrix(viewport);
  const inverseReference = inverseDisplayMatrix(reference);
  if (!inverseView || !inverseReference) return { x: NaN, y: NaN };
  const mouse = displayMatrixPoint(inverseView, fromPixels(physicalPixels));
  const virtualToDevice = scaleMatrix(viewport.a);
  const twipsToPixels = scaleMatrix(1 / 20);
  const devicePoint = displayMatrixPoint(
    displayMatrixProduct(twipsToPixels, virtualToDevice),
    mouse,
  );
  const localToDevice = displayMatrixProduct(
    displayMatrixProduct(virtualToDevice, twipsToPixels),
    target,
  );
  const local = displayMatrixPoint(
    inverseDisplayMatrix(localToDevice) ?? DISPLAY_IDENTITY,
    devicePoint,
  );
  const eventStage = displayMatrixPoint(target, fromPixels(toPixels(local)));
  return toPixels(displayMatrixPoint(inverseReference, fromPixels(toPixels(eventStage))));
}
