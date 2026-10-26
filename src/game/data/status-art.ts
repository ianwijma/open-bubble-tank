import symbols from './symbols.json';
import type { DecoratedStatus } from '../core/types';

// _-Zx.EffectMeCrazy constructors; numeric IDs are recovered from SymbolClass.
export const STATUS_ART: Record<DecoratedStatus, number> = {
  sticky: symbols['_-6d'],
  stun: symbols['_-Y1'],
  jam: symbols['_-Aa'],
  weaken: symbols['_-It'],
};
export const INFECTED_ART = symbols.effect_infected;
export const INK_ART = symbols.ink_effect;
export const PROTECTION_ART = {
  shield: symbols['_-BF'],
  shieldHit: symbols['_-Ne'],
  turretShield: symbols['_-bM'],
  turretShieldHit: symbols['_-KJ'],
  forcefield: symbols['BubbleTanks3_fla.forcefieldanimation_551'],
};
