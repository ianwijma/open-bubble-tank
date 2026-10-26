import type { SwfSymbolView } from './swf-symbol-view';

/** _-CO/HealerBeam resize their authored line and mask, leaving the moving beam strip intact. */
export function setBeamLength(view: SwfSymbolView, length: number) {
  const line = view.namedChild('line_mc')?.root;
  const mask = view.namedChild('mask_mc')?.root;
  const beam = view.namedChild('beam_mc')?.root;
  const cap = view.namedChild('endCap_mc')?.root;
  if (line) line.width = Math.max(0.01, length);
  if (mask) mask.width = Math.max(0.01, length + 4);
  if (cap) cap.x = length;
  if (beam && mask) beam.mask = mask;
}
