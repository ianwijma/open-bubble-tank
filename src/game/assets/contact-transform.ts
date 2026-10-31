import { DEG } from '../core/math';

/** Linear transform only; translations do not change geometric stroke widths. */
export interface ContactMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
}
export const CONTACT_IDENTITY: ContactMatrix = { a: 1, b: 0, c: 0, d: 1 };

export function contactTransform(angle: number, x = 1, y = x): ContactMatrix {
  const c = Math.cos(angle * DEG),
    s = Math.sin(angle * DEG);
  return { a: c * x, b: s * x, c: -s * y, d: c * y };
}

/** Inverse(child-to-parent) × Stage-to-parent. Excludes CSS/DPR scaling. */
export function descendContact(parent: ContactMatrix, child: ContactMatrix): ContactMatrix | null {
  const { a, b, c, d } = child,
    det = a * d - b * c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;
  return {
    a: (d * parent.a - c * parent.b) / det,
    b: (-b * parent.a + a * parent.b) / det,
    c: (d * parent.c - c * parent.d) / det,
    d: (-b * parent.c + a * parent.d) / det,
  };
}

/** Ruffle geometric contact: a one-logical-stage-pixel minimum, in leaf units. */
export function contactStrokeWidth(authored: number, inverse: ContactMatrix) {
  return Math.max(authored, Math.hypot(inverse.a, inverse.b), Math.hypot(inverse.c, inverse.d));
}
