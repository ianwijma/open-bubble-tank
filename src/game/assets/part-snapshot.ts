import { Random } from '../core/math';
import type { PartDefinition } from '../core/types';
import { SwfClip, type ClipSource } from './swf-clip';

/** Fresh poster construction and the source's separate body-only class capture. */
export function partSnapshot(
  part: Pick<PartDefinition, 'id' | 'symbol'>,
  source: ClipSource,
  purpose: 'poster' | 'class' = 'poster',
  y = 0,
) {
  if (purpose === 'class' && part.id >= 2000)
    throw new Error('Class captures contain only body bubbles.');
  // Repeatable private phases for cached artwork; never consume gameplay randomness.
  const random = new Random(Math.imul(part.id + 1, 0x9e3779b1) >>> 0 || 1);
  const clip = new SwfClip(part.symbol, source, () => random.next());
  if (purpose === 'class') clip.start(2, false, y);
  else clip.advance(1, y);
  return clip;
}
