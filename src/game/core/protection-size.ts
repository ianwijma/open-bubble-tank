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
