import type { SwfMatrix } from '../assets/asset-pack';
import { MAIN_MENU, type MainMenuMotion } from './main-menu';
import { MENU_SERIES, type SeriesControl } from './menu-series';
import type { Vec } from './types';

export type MenuTarget =
  | { kind: 'control' | 'decoration'; name: string }
  | { kind: 'series'; name?: SeriesControl }
  | { kind: 'blocked' };

export function sameMenuTarget(a?: MenuTarget, b?: MenuTarget) {
  return (
    a?.kind === b?.kind &&
    (a && 'name' in a ? a.name : undefined) === (b && 'name' in b ? b.name : undefined)
  );
}

export function menuLocal(point: Vec, matrix: SwfMatrix): Vec | undefined {
  const det = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(det) < 1e-9) return;
  const x = point.x - matrix.tx / 20,
    y = point.y - matrix.ty / 20;
  return { x: (matrix.d * x - matrix.c * y) / det, y: (-matrix.b * x + matrix.a * y) / det };
}

/** Procedural UI input follows its painted ellipses/capsule, including the last link's round end. */
export function mockMenuTarget(point: Vec, motion: MainMenuMotion): MenuTarget | undefined {
  const series = menuLocal(point, MAIN_MENU.series.matrix)!;
  for (const p of [...MENU_SERIES.controls].reverse()) {
    const name = p.name as SeriesControl;
    if (!motion.series.activeControls.includes(name)) continue;
    const local = menuLocal(series, p.matrix)!,
      b = p.bounds;
    if (local.x < b.x || local.x > b.x + b.width || local.y < b.y || local.y > b.y + b.height)
      continue;
    const radius = b.height / 2,
      rightCenter = b.x + b.width - radius;
    if (
      name !== 'bttd_mc' ||
      local.x <= rightCenter ||
      Math.hypot(local.x - rightCenter, local.y - b.y - radius) <= radius
    )
      return { kind: 'series', name };
  }
  const radius = 11,
    width = motion.series.width;
  const nearest = Math.max(radius, Math.min(width - radius, series.x));
  if (Math.hypot(series.x - nearest, series.y - radius) <= radius) return { kind: 'series' };
  for (const p of [...MAIN_MENU.controls].reverse()) {
    const local = menuLocal(point, p.matrix)!,
      b = p.bounds;
    const x = (local.x - b.x - b.width / 2) / (b.width / 2),
      y = (local.y - b.y - b.height / 2) / (b.height / 2);
    if (x * x + y * y <= 1) return { kind: 'control', name: p.name };
  }
}
