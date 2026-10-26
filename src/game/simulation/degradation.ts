import type { Tank, TankDesign } from '../core/types';
import { distance, length } from '../core/math';

/** _-Zx._-Il / _-0Y. All mounted parts contribute to the total's divisor. */
export function bodyWeights(design: TankDesign) {
  const weapons = design.parts.filter((part) => part.type > 2000);
  return design.parts
    .filter((part) => part.type < 2000)
    .map((part) => ({
      part,
      weight:
        ((part.type % 10) * part.scale) ** 2 /
        Math.max(
          1,
          ...(weapons.length
            ? [Math.min(...weapons.map((weapon) => distance(weapon, part)))]
            : [1]),
        ),
    }));
}

export function createDegradation(design: TankDesign): Tank['degradation'] {
  const weights = bodyWeights(design),
    count = design.parts.length;
  return {
    debt: 0,
    total: weights.reduce(
      (sum, entry) => sum + (entry.weight * Math.pow(count, -1) * Math.sqrt(count)) / 2,
      0,
    ),
    minimum: Math.min(999999999, ...weights.map((entry) => entry.weight)),
  };
}

/** Literal DegradeTank selection: prefer the outermost visible body when affordable,
 * otherwise scan in mount order toward cheaper bodies. Debt persists across hits/heals. */
export function degradeTank(tank: Tank, damage: number) {
  const weights = bodyWeights(tank.design),
    byKey = new Map(weights.map((entry) => [entry.part.key, entry]));
  const visible = () =>
    weights.filter(
      ({ part }) => !tank.hiddenParts.has(part.key) && !tank.removedParts.has(part.key),
    );
  const outermost = () =>
    visible().reduce<(typeof weights)[number] | undefined>(
      (best, entry) =>
        !best || length(entry.part) + entry.part.radius > length(best.part) + best.part.radius
          ? entry
          : best,
      undefined,
    );
  const state = tank.degradation;
  state.debt += ((damage | 0) / tank.maxLife) * state.total;
  let candidate = outermost(),
    index = 0;
  while (index < tank.design.parts.length && state.debt >= state.minimum) {
    const outside = outermost();
    if (!outside) break;
    if (outside.weight <= state.debt) candidate = outside;
    else {
      const entry = byKey.get(tank.design.parts[index].key);
      if (
        entry &&
        !tank.hiddenParts.has(entry.part.key) &&
        !tank.removedParts.has(entry.part.key) &&
        entry.weight < (candidate?.weight ?? Infinity)
      )
        candidate = entry;
      index++;
    }
    if (candidate && candidate.weight <= state.debt) {
      tank.hiddenParts.add(candidate.part.key);
      state.debt -= candidate.weight;
      state.minimum = Math.min(999999, ...visible().map((entry) => entry.weight));
    }
  }
}
