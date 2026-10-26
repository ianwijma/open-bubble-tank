import type { PartDefinition } from '../core/types';

export interface PaletteContext {
  avatar: boolean;
  level: number;
  classId: number;
  budget: number;
  gp: number;
  bp: number;
}
export type AffordabilityReason =
  'complexity' | 'gun-points' | 'minimum-class' | 'maximum-class' | null;

/** UpdateAffordableArray checks one object, independently of symmetry and locks. */
export function paletteState(part: PartDefinition, context: PaletteContext) {
  let reason: AffordabilityReason = null;
  if (context.bp + part.bp > 100) reason = 'complexity';
  else if (part.gp > context.budget - context.gp) reason = 'gun-points';
  else if (
    part.classCost &&
    (part.lower ? context.classId > part.classCost : context.classId < part.classCost)
  )
    reason = part.lower ? 'maximum-class' : 'minimum-class';
  return {
    locked: context.avatar && part.tier > context.level,
    affordable: reason === null,
    reason,
  };
}

/** _-ay orders unlocked rows first, then numeric cost and the four-digit object ID. */
export function orderedPalette(parts: readonly PartDefinition[], context: PaletteContext) {
  return [...parts].sort(
    (a, b) =>
      Number(paletteState(a, context).locked) - Number(paletteState(b, context).locked) ||
      a.gp - b.gp ||
      a.id - b.id,
  );
}

/** _-1X initially selects the first affordable unlocked row in the sorted library. */
export function firstAffordablePart(parts: readonly PartDefinition[], context: PaletteContext) {
  return (
    orderedPalette(parts, context).find((part) => {
      const state = paletteState(part, context);
      return !state.locked && state.affordable;
    })?.id ?? null
  );
}

export function affordabilityHint(part: PartDefinition, reason: AffordabilityReason) {
  switch (reason) {
    case 'complexity':
      return 'Exceeds maximum complexity (100 BP).';
    case 'gun-points':
      return 'Not enough Gun Points.';
    case 'minimum-class':
      return `Requires class ${part.classCost} or higher.`;
    case 'maximum-class':
      return `Requires class ${part.classCost} or lower.`;
    default:
      return '';
  }
}
