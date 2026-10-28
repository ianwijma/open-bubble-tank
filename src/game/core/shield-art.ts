import type { ShieldClip, Tank } from './types';

/** Explicitly initialized snapshots can still use the shared clip fields. */
export function legacyShieldFilm(tank: Tank) {
  return (
    (tank.shieldClips.length === 0 && tank.shield > 0) ||
    tank.displayChildren.includes('shield-film')
  );
}

export function shieldClipFrame(clip: ShieldClip) {
  return clip.kind === 'hit'
    ? Math.min(16, clip.age + 1)
    : clip.style === 'turret'
      ? Math.min(25, clip.age + 1)
      : clip.age + 1;
}
