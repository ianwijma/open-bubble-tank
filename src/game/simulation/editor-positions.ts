import { displayPixel } from '../core/display-values';
import type { TankPart, Vec } from '../core/types';

/**
 * TankCreatorScreen keeps raw arrTankDetails coordinates apart from clip.x/y.
 * This transient book owns display getters; it never enters a tank code/history.
 */
export class EditorPositions {
  private positions = new Map<string, Vec>();
  private cached: { saved: TankPart[]; displayed: TankPart[] } | null = null;

  constructor(parts: TankPart[]) {
    this.reset(parts);
  }

  /** Loading and undo reconstruct clips from raw metadata through their setters. */
  reset(parts: TankPart[]) {
    this.positions = new Map(
      parts.map((p) => [p.key, { x: displayPixel(p.x), y: displayPixel(p.y) }]),
    );
    this.cached = null;
  }

  /** Retain existing clips when metadata changes; create/remove only membership. */
  retain(parts: TankPart[]) {
    const keys = new Set(parts.map((p) => p.key));
    let changed = false;
    for (const key of this.positions.keys())
      if (!keys.has(key)) {
        this.positions.delete(key);
        changed = true;
      }
    for (const part of parts)
      if (!this.positions.has(part.key)) {
        this.positions.set(part.key, { x: displayPixel(part.x), y: displayPixel(part.y) });
        changed = true;
      }
    if (changed) this.cached = null;
  }

  /** Cached identity keeps retained selection outlines independent of React renders. */
  present(parts: TankPart[]): TankPart[] {
    if (this.cached?.saved === parts) return this.cached.displayed;
    const displayed = parts.map((part) => ({
      ...part,
      ...(this.positions.get(part.key) ?? {
        x: displayPixel(part.x),
        y: displayPixel(part.y),
      }),
    }));
    this.cached = { saved: parts, displayed };
    return displayed;
  }

  /** A drag session already performed the actual per-event display writes. */
  adopt(parts: TankPart[]) {
    this.positions = new Map(parts.map((p) => [p.key, { x: p.x, y: p.y }]));
    this.cached = null;
  }

  /** Source frame handlers write a clip and its independent metadata separately. */
  nudge(keys: readonly string[], direction: number, frames = 1) {
    for (let frame = 0; frame < frames; frame++)
      for (const key of keys) {
        const p = this.positions.get(key);
        if (p) p.x = displayPixel(p.x + direction);
      }
    this.cached = null;
  }

  center(keys: readonly string[]) {
    for (const key of keys) {
      const p = this.positions.get(key);
      if (p) p.y = 0;
    }
    this.cached = null;
  }

  /** StopDrag synchronizes only selected surviving clips into arrTankDetails. */
  saveSelected(parts: TankPart[], keys: readonly string[]): TankPart[] {
    return parts.map((part) =>
      keys.includes(part.key) ? { ...part, ...this.positions.get(part.key) } : part,
    );
  }
}

/** Drag merges/splits change metadata membership and links before position release. */
export function editorDragTopology(saved: TankPart[], displayed: TankPart[]): TankPart[] {
  const previous = new Map(saved.map((p) => [p.key, p]));
  return displayed.map((part) => {
    const old = previous.get(part.key);
    return old ? { ...part, x: old.x, y: old.y } : { ...part };
  });
}
