import type { ProjectileKind, Status } from '../core/types';
// Combat constants transcribed from dossier 06/07; code takes precedence over DB prose.
export interface WeaponSpec {
  rate: number;
  speed: number;
  damage: number;
  size?: number;
  kind?: ProjectileKind;
  angles?: number[];
  parallel?: number;
  status?: Status;
  explode?: number;
  symbol?: number;
  splashDamage?: number;
}
const shell = (
  rate: number,
  speed: number,
  damage: number,
  extra: Partial<WeaponSpec> = {},
): WeaponSpec => ({ rate, speed, damage, kind: 'shell', symbol: 1721, ...extra });
export const WEAPONS: Record<number, WeaponSpec> = {
  2001: shell(13, 10, 1),
  2002: shell(25, 8, 3, { size: 2.5 }),
  2003: shell(6, 10, 1),
  2004: shell(4, 10, 1),
  2005: shell(10, 10, 2, { size: 1.25, parallel: 2 }),
  2006: shell(11, 10, 1, { parallel: 2 }),
  2007: shell(11, 10, 1, { angles: [0, -30, 30] }),
  2008: shell(11, 10, 1, { angles: [-20, -10, 0, 10, 20] }),
  2009: shell(32, 14, 15, { kind: 'pierce', explode: 75, splashDamage: 100 }),
  2010: shell(45, 14, 30, { kind: 'pierce', explode: 75, splashDamage: 100 }),
  2011: shell(8, 10, 2, { kind: 'leech' }),
  2012: shell(40, 10, 1, { kind: 'buster' }),
  2014: shell(18, 8, 3, { size: 2.5 }),
  2015: shell(1, 10, 1, { kind: 'grow' }),
  2016: shell(20, 15, 8, { kind: 'ricochet' }),
  2017: shell(3, 0, 1, { kind: 'beam' }),
  2018: shell(18, 8, 0, { kind: 'push' }),
  2022: shell(12, 10, 1, { parallel: 3 }),
  3001: shell(150, 6, 0, {
    status: 'sticky',
    angles: Array.from({ length: 36 }, (_, i) => i * 10),
  }),
  3002: shell(150, 0, 0),
  3003: shell(120, 0, 25),
  3004: shell(140, 12, 20, { explode: 125, splashDamage: 30 }),
  3005: shell(90, 8, 35, { kind: 'star', size: 1.7 }),
  3006: shell(160, 0, 0),
  3007: shell(120, 0, 0),
  3008: shell(140, 7, 100, { kind: 'pierce', size: 4, explode: 75, splashDamage: 30 }),
  3009: shell(90, 6, 10, { kind: 'seeker' }),
  3010: shell(60, 0, 0),
  3011: shell(100, 0, 0),
  3012: shell(100, 0, 0),
  3013: shell(240, 6, 1, { kind: 'infect', status: 'infect' }),
  3014: shell(90, 0, 30, { kind: 'whip' }),
  3015: shell(120, 10, 4, { kind: 'rocket' }),
  3016: shell(240, 0, 0),
  3017: shell(2500, 3, 1000, { kind: 'apocalypse', size: 6, explode: 600 }),
  4001: shell(50, 7, 1, { symbol: 1717 }),
  4002: shell(120, 5, 2, { kind: 'seeker' }),
  4003: shell(200, 0, 0),
  4004: shell(60, 8, 2, { angles: [-30, 0, 30], symbol: 1717 }),
  4005: shell(60, 8, 1, { parallel: 3, symbol: 1717 }),
  4006: shell(60, 8, 1, { parallel: 5, symbol: 1717 }),
  4007: shell(60, 8, 2, { angles: [-20, -10, 0, 10, 20], symbol: 1717 }),
  4008: shell(100, 7, 2, {
    angles: Array.from({ length: 10 }, (_, i) => -144 + i * 36),
    symbol: 1717,
  }),
  // _-J2 passes speed10 even though the mine's MoveBullet never advances position.
  4009: shell(40, 10, 10, { kind: 'mine', symbol: 1792 }),
  4010: shell(20, 3, 1, { kind: 'orbital' }),
  4011: shell(80, 6, 0, { status: 'sticky' }),
  4012: shell(120, 6, 3, { kind: 'sapper' }),
  4013: shell(0, 0, 0),
  4015: shell(4, 6, 4, { size: 1.8, symbol: 1717 }),
  4016: shell(90, 5, 4, { size: 2.5, symbol: 1717 }),
  // _-IB uses a rate-1 trigger plus its own 120/4 counters (not a rate-5 age gate).
  4017: shell(1, 7, 2, { symbol: 1717 }),
  4018: shell(80, 6, 0, { status: 'ink' }),
  4019: shell(240, 5, 3, { kind: 'spin' }),
  4020: shell(150, 10, 3, { kind: 'rocket' }),
  4021: shell(40, 4, 7, { kind: 'seekerMine', symbol: 2178 }),
  4022: shell(0, 0, 0),
  4023: shell(240, 0, 0),
  4024: shell(80, 0, 0),
  4025: shell(80, 6, 0, { status: 'jam' }),
  4026: shell(15, 0, 3),
  4032: shell(80, 0, 0),
  5003: shell(12, 10, 1),
  5004: shell(12, 4, 0, { kind: 'flak' }),
  5006: shell(20, 3, 7, { kind: 'orbital' }),
  7001: shell(12, 10, 1),
};
