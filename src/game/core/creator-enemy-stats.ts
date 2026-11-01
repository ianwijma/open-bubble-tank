import type { TankDesign } from './types';
import { costs } from '../data/catalog';

export type EnemyStat = 'life' | 'reward' | 'speed';
export type EnemyStats = Pick<TankDesign, EnemyStat>;
export const NEW_ENEMY_STATS: EnemyStats = { life: 20, reward: 20, speed: 2 };

/** _-Rn rounds before class multiplication; UseSuggestedSettings rounds after; _-H9 does neither. */
export function creatorSuggestedStats(
  design: Pick<TankDesign, 'parts' | 'classId'>,
  phase: 'panel' | 'save' | 'load' = 'panel',
): EnemyStats {
  const { gp, bp } = costs(design.parts),
    base = bp / 2 + gp * 3,
    c = design.classId;
  const life =
    phase === 'save' ? Math.round(base) * c : phase === 'load' ? base * c : Math.round(base * c);
  const reward = Math.max(
    1,
    Math.round(life * (0.3 * ((7 - c) / 6) + 0.005 * gp + 0.1 - Math.min(0.1, 0.0005 * life))),
  );
  const speed = Math.floor(Math.max(0.1, 3 * ((6 - c) / 6) + 0.5 - gp * 0.1) * 100) / 100;
  return { life, reward, speed };
}

/** ImportTank compares the preceding build's counters and never re-enables manual mode. */
export function creatorImportedSuggested(
  tank: EnemyStats,
  previous: Pick<TankDesign, 'parts' | 'classId'>,
  enabled = true,
) {
  const expected = creatorSuggestedStats(previous, 'load');
  return (
    enabled && (['life', 'reward', 'speed'] as const).every((key) => tank[key] === expected[key])
  );
}
