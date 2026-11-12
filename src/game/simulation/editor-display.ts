import { displayPixel, displayRotation } from '../core/display-values';
import type { TankPart } from '../core/types';

type ClipPose = Pick<TankPart, 'x' | 'y' | 'rotation' | 'scale'>;
const pose = (part: TankPart): ClipPose => ({
  x: part.x,
  y: part.y,
  rotation: part.rotation,
  scale: part.scale,
});
const loadedPose = (part: TankPart): ClipPose => ({
  ...pose(part),
  x: displayPixel(part.x),
  y: displayPixel(part.y),
  rotation: displayRotation(part.rotation),
});

/**
 * TankCreatorScreen keeps raw arrTankDetails apart from retained display clips.
 * This transient book owns display getters; it never enters a tank code/history.
 */
export class EditorDisplayState {
  private clips = new Map<string, ClipPose>();
  private cached: { saved: TankPart[]; displayed: TankPart[] } | null = null;

  constructor(parts: TankPart[]) {
    this.reset(parts);
  }

  /** Loading and undo reconstruct clips from raw metadata through their setters. */
  reset(parts: TankPart[]) {
    this.clips = new Map(parts.map((p) => [p.key, loadedPose(p)]));
    this.cached = null;
  }

  /** Retain existing clips when metadata changes; create/remove only membership. */
  retain(parts: TankPart[]) {
    const keys = new Set(parts.map((p) => p.key));
    let changed = false;
    for (const key of this.clips.keys())
      if (!keys.has(key)) {
        this.clips.delete(key);
        changed = true;
      }
    for (const part of parts)
      if (!this.clips.has(part.key)) {
        this.clips.set(part.key, loadedPose(part));
        changed = true;
      }
    if (changed) this.cached = null;
  }

  /** Cached identity keeps retained selection outlines independent of React renders. */
  present(parts: TankPart[]): TankPart[] {
    if (this.cached?.saved === parts) return this.cached.displayed;
    const displayed = parts.map((part) => ({
      ...part,
      ...(this.clips.get(part.key) ?? loadedPose(part)),
    }));
    this.cached = { saved: parts, displayed };
    return displayed;
  }

  /** Retain getters already produced by an edit or restored from a gesture snapshot. */
  adopt(parts: TankPart[]) {
    this.clips = new Map(parts.map((p) => [p.key, pose(p)]));
    this.cached = null;
  }

  /** Source frame handlers write a clip and its independent metadata separately. */
  nudge(keys: readonly string[], direction: number, frames = 1) {
    for (let frame = 0; frame < frames; frame++)
      for (const key of keys) {
        const p = this.clips.get(key);
        if (p) p.x = displayPixel(p.x + direction);
      }
    this.cached = null;
  }

  center(keys: readonly string[]) {
    for (const key of keys) {
      const p = this.clips.get(key);
      if (p) p.y = 0;
    }
    this.cached = null;
  }

  /** StopDrag synchronizes only selected surviving clips into arrTankDetails. */
  saveSelected(parts: TankPart[], keys: readonly string[]): TankPart[] {
    return parts.map((part) => {
      const p = this.clips.get(part.key);
      return p && keys.includes(part.key) ? { ...part, x: p.x, y: p.y } : part;
    });
  }

  /** _-1N/_-Xf copy only the released handle's getter; a no-move release also copies. */
  saveTransform(parts: TankPart[], keys: readonly string[], field: 'scale' | 'rotation') {
    return parts.map((part) => {
      const p = this.clips.get(part.key);
      return p && keys.includes(part.key) ? { ...part, [field]: p[field] } : part;
    });
  }
}

/** Clip edits change membership/links while existing raw transform fields await release. */
export function editorDisplayTopology(saved: TankPart[], displayed: TankPart[]): TankPart[] {
  const previous = new Map(saved.map((p) => [p.key, p]));
  return displayed.map((part) => {
    const old = previous.get(part.key);
    return old
      ? { ...part, x: old.x, y: old.y, rotation: old.rotation, scale: old.scale }
      : { ...part };
  });
}
