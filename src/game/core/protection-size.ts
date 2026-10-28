import type { Vec } from './types';

/** TankData.GetLargestRadiusFromRegistration, including its strict-order/NaN quirks. */
export function protectionRadius(children: readonly (Vec & { width: number; height: number })[]) {
  let maximum = 0,
    diagonal = NaN;
  for (const child of children) {
    const next = Math.max(maximum, Math.abs(child.x), Math.abs(child.y));
    if (next > maximum) {
      maximum = next;
      diagonal = Math.hypot(child.width / 1.25, child.height / 1.25);
    }
  }
  return maximum + diagonal;
}

/** Flash width/height assignment on a fresh protection clip; invalid sizes are ignored. */
export function protectionScale(
  bounds: { width: number; height: number } | undefined,
  diameter: number,
  uniform = false,
) {
  if (!bounds || !(diameter >= 0)) return { x: 1, y: 1 };
  const x = bounds.width ? diameter / bounds.width : 1;
  return { x, y: uniform ? x : bounds.height ? diameter / bounds.height : 1 };
}
