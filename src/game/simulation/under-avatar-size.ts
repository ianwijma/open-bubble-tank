import authored from '../data/field-display.json';
import { positiveAxisAlignedSize } from '../core/axis-aligned-size';
import { DISPLAY_IDENTITY } from '../core/display-transform';
import type { UnderAvatarSizeResolver } from './field-display';

// The supplied original's 1544 has exactly one identity-placed shape1543.
// Reject changed layouts rather than silently treating a different tree as this leaf.
const placements = authored.sprites['1544'];
const child = placements[0];
const qualifiedLayout =
  placements.length === 1 &&
  child.symbol === 1543 &&
  Object.entries(DISPLAY_IDENTITY).every(
    ([key, value]) => child.matrix[key as keyof typeof DISPLAY_IDENTITY] === value,
  );

export const resolveUnderAvatarSize: UnderAvatarSizeResolver = (operation) => {
  if (!qualifiedLayout || operation.previousUnresolved) return undefined;
  const result = positiveAxisAlignedSize(
    operation.before,
    authored.shapes['1543'],
    operation.property,
    operation.value,
  );
  return result ? { qualification: 'qualified', ...result } : undefined;
};
