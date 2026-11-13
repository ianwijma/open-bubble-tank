import type { World } from '../simulation/world';
import { isArtwork } from '../simulation/registered-effects';
import type { EffectPaint } from './combat-effects-view';
import { bottomTransform, fieldPoint, worldLayerTransform } from './field-transform';
import { fieldTransform } from './field-transform';
import type { LowerEffectMaskPaint } from './field-lower-effects-view';

/** Mask and117 have separate retained ancestry and scale. No display mutation. */
export function projectLowerEffectMasks(world: World): LowerEffectMaskPaint[] {
  return world.attachedFields().flatMap(({ field }) => {
    const layer = world.effectEngine.layer(field, 'bottom');
    return layer && world.effectEngine.layerAttached(layer)
      ? [
          {
            field,
            read: world.fieldDisplays.read(field),
            transform: fieldTransform(world, field, 'underMask'),
          },
        ]
      : [];
  });
}

/** Physical children determine pose/alpha; completion context and request arrays are not parents. */
export function projectEffects(world: World): EffectPaint[] {
  const effects: EffectPaint[] = [];
  for (const { field } of world.attachedFields())
    for (const kind of ['bottom', 'top'] as const) {
      const layer = world.effectEngine.layer(field, kind);
      if (!layer || !world.effectEngine.layerAttached(layer)) continue;
      const transform =
        kind === 'bottom'
          ? bottomTransform(world, field)
          : worldLayerTransform(world, field, 'top');
      for (const clip of world.effectEngine.owned(layer)) {
        if (!isArtwork(clip)) continue;
        effects.push({
          ...fieldPoint(clip, transform),
          clip,
          field,
          layer: kind,
          scale: (clip.scale ?? 1) * transform.scale,
          parentAlpha: transform.alpha,
        });
      }
    }
  if (world.effectEngine.layerAttached(world.effectEngine.screen))
    for (const clip of world.effectEngine.owned(world.effectEngine.screen))
      if (isArtwork(clip)) effects.push({ ...clip, clip, layer: 'screen' });
  return effects;
}
