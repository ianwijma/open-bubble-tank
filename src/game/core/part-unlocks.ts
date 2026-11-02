import { partById } from '../data/catalog';

/** Use the stored profile list when supplied; tier fallback supports legacy profiles. */
export function partUnlocked(
  id: number,
  level: number,
  unlockedParts?: readonly number[],
  tier = partById(id)?.tier ?? Infinity,
) {
  return unlockedParts ? unlockedParts.includes(id) : tier <= level;
}
