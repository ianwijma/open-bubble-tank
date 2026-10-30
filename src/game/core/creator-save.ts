import type { TankDesign } from './types';
/** SaveExitMouseUp checks the broad catalog category, before opening TankScreens2. */
export function creatorSavePrerequisite(design: TankDesign) {
  if (design.avatar && !design.parts.some((p) => Math.floor(p.type / 1000) > 1))
    return 'You must have at least 1 weapon to save an Avatar tank';
  if (!design.parts.some((p) => Math.floor(p.type / 1000) <= 1))
    return 'You must have at least 1 bubble to save a tank';
  return null;
}
/** Guest PlayerProfile._-ba; saved tank authors do not replace the profile name. */
export const CREATOR_AUTHOR = 'BubbleTanks3';
