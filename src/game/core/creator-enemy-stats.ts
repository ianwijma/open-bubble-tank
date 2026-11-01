import type { TankDesign } from './types';
import { costs } from '../data/catalog';

export type EnemyStat = 'life' | 'reward' | 'speed';
export type EnemyStats = Pick<TankDesign, EnemyStat>;
export const ENEMY_STAT_LIMITS = {
  life: { min: 1, max: 1000 },
  reward: { min: 1, max: 500 },
  speed: { min: 0, max: 4 },
} as const;
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

export function enemyStatHandle(key: EnemyStat, value: number) {
  const { min, max } = ENEMY_STAT_LIMITS[key];
  const x = Math.max(-55, Math.min(55, Math.sqrt((value - min) / (max - min)) * 110 - 55));
  // Ruffle's DisplayObject.x setter converts through Twips (NaN becomes0).
  return Number.isNaN(x) ? 0 : Math.trunc(x * 20) / 20;
}
export function enemyStatFromHandle(key: EnemyStat, x: number) {
  const { min, max } = ENEMY_STAT_LIMITS[key],
    t = (Math.max(-55, Math.min(55, x)) + 55) / 110;
  return (
    min + Math.trunc((max - min) * t * t * (key === 'speed' ? 10 : 1)) / (key === 'speed' ? 10 : 1)
  );
}
export function enemyStatText(key: EnemyStat, text: string): number | undefined {
  if (key === 'speed' && text.endsWith('.')) return undefined;
  const { min, max } = ENEMY_STAT_LIMITS[key],
    value = Number(text);
  return Number.isNaN(value) ? min : Math.max(min, Math.min(max, value));
}
