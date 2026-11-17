import type { ArtMatrix } from '../assets/asset-pack';
import { MAIN_MENU } from './main-menu';
import type { Vec } from './types';

export type MenuTarget = { kind: 'control' | 'decoration'; name: string } | { kind: 'blocked' };

export function sameMenuTarget(a?: MenuTarget, b?: MenuTarget) {
  return (
    a?.kind === b?.kind &&
    (a && 'name' in a ? a.name : undefined) === (b && 'name' in b ? b.name : undefined)
  );
}

export function menuLocal(point: Vec, matrix: ArtMatrix): Vec | undefined {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (!Number.isFinite(det) || det === 0) return;
  const x = point.x - matrix.tx / 20,
    y = point.y - matrix.ty / 20;
  return { x: (matrix.d * x - matrix.c * y) / det, y: (-matrix.b * x + matrix.a * y) / det };
}

/** Procedural UI input follows its painted ellipses. */
export function mockMenuTarget(point: Vec): MenuTarget | undefined {
  for (const p of [...MAIN_MENU.controls].reverse()) {
    const local = menuLocal(point, p.matrix)!,
      b = p.bounds;
    const x = (local.x - b.x - b.width / 2) / (b.width / 2),
      y = (local.y - b.y - b.height / 2) / (b.height / 2);
    if (x * x + y * y <= 1) return { kind: 'control', name: p.name };
  }
}
