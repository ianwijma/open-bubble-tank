import symbols from './symbols.json';
import type { DecoratedStatus, ShieldClip } from '../core/types';

// Status effect constructors; numeric IDs come from the symbol table.
export const STATUS_ART: Record<DecoratedStatus, number> = {
  sticky: symbols.stickyStatus,
  stun: symbols.stunStatus,
  jam: symbols.jamStatus,
  weaken: symbols.weakenStatus,
};
export const INFECTED_ART = symbols.infectedStatus;
export const PROTECTION_ART = {
  shield: symbols.shield,
  shieldHit: symbols.shieldHit,
  turretShield: symbols.turretShield,
  turretShieldHit: symbols.turretShieldHit,
  forcefield: symbols.forcefield,
};

export function shieldClipSymbol(clip: ShieldClip) {
  if (clip.style === 'turret')
    return clip.kind === 'film' ? PROTECTION_ART.turretShield : PROTECTION_ART.turretShieldHit;
  return clip.kind === 'film' ? PROTECTION_ART.shield : PROTECTION_ART.shieldHit;
}
