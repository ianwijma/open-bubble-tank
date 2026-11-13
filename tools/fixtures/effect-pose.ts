import type { Effect, Vec } from '../../src/game/core/types';
import { displayPixel } from '../../src/game/core/display-values';

/** Artificial gallery setup supplies the omitted CreateEffect position and timeline seek.
 * Production ages are telemetry, not a currentFrame setter. No renderer constructs a pose.
 */
export function setEffectFixturePose(effect: Effect, age: number, position?: Vec) {
  if (!effect.playback) throw new Error('Fixture requires an explicitly constructed native effect');
  if (position) {
    effect.x = displayPixel(position.x);
    effect.y = displayPixel(position.y);
  }
  if (effect.playback.pose.age < age + 1) effect.playback.pose.advance(age + 1);
  else effect.playback.pose.gotoAndPlay(age + 1);
  effect.age = age;
}
