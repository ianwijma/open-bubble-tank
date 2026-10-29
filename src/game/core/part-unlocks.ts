import { PARTS, partById } from '../data/catalog';

export function partUnlocked(
  id: number,
  level: number,
  unlockedParts?: readonly number[],
  tier = partById(id)?.tier ?? Infinity,
) {
  return unlockedParts ? unlockedParts.includes(id) : tier <= level;
}
/** PlayerProfile._-cq and UpgradeMenu.UpdateUnlocked. New worlds reset; downgrades do not. */
export class RunPartUnlocks {
  private snapshot: readonly number[] = PARTS.filter(
    (p) =>
      p.id < 2000 ||
      p.id === 2001 ||
      Math.floor(p.id / 1000) === 4 ||
      Math.floor(p.id / 1000) === 6,
  ).map((p) => p.id);
  get parts() {
    return this.snapshot;
  }
  unlockThrough(level: number) {
    const additions = PARTS.filter(
      (p) => p.tier > 0 && p.tier <= level && !this.snapshot.includes(p.id),
    )
      .sort((a, b) => a.tier - b.tier || a.id - b.id)
      .map((p) => p.id);
    if (additions.length) this.snapshot = [...this.snapshot, ...additions];
  }
}
