import type { TankPart, Vec } from '../core/types';
import { type PartSelection, removeParts, unlinkSelection } from './editor-selection';

/** Transient state corresponding to TankCreatorScreen.StartDrag/_-5M. */
export interface SelectionDrag {
  parts: TankPart[];
  selection: PartSelection;
  cursor: Vec;
  symmetric: boolean;
  onSide: Map<string, boolean>;
  reference: string | undefined;
  referenceY: number;
  snapOffsetY: number;
  locked: boolean;
  nextTwin: number;
}
export function beginSelectionDrag(
  parts: TankPart[],
  selection: PartSelection,
  cursor: Vec,
  symmetric: boolean,
  locked = false,
  firstMove = cursor,
): SelectionDrag {
  const chosen = selection.keys
    .map((key) => parts.find((p) => p.key === key))
    .filter((p) => p !== undefined);
  const onSide = new Map(chosen.map((p) => [p.key, p.y >= 0 === cursor.y >= 0]));
  const reference = chosen.find((p) => onSide.get(p.key)) ?? chosen[0];
  return {
    parts,
    selection,
    cursor,
    symmetric,
    onSide,
    reference: reference?.key,
    referenceY: reference?.y ?? 0,
    snapOffsetY: firstMove.y - (reference?.y ?? 0),
    locked,
    nextTwin: 1,
  };
}

/** Advance one mouse-move event, preserving the source's pre-move snap test. */
export function advanceSelectionDrag(before: SelectionDrag, cursor: Vec): SelectionDrag {
  let parts = before.parts,
    selection = before.selection;
  const onSide = new Map(before.onSide);
  const referenceY = parts.find((p) => p.key === before.reference)?.y ?? before.referenceY;
  let dy = cursor.y - before.cursor.y,
    locked = before.locked,
    changed = false;
  let nearest: TankPart | undefined,
    distance = 0.5;
  if (before.symmetric) {
    for (const key of selection.keys) {
      const p = parts.find((p) => p.key === key);
      if (p && Math.abs(p.y) <= 3 && Math.abs(p.y) <= distance) {
        distance = Math.abs(p.y);
        nearest = p;
      }
    }
    if (nearest) {
      if (!locked) {
        // This assignment is positive in the shipped AVM2 bytecode too.
        dy = nearest.y;
        locked = true;
        changed = true;
      } else if (Math.abs(cursor.y - referenceY - before.snapOffsetY) > distance) {
        dy = cursor.y - before.snapOffsetY - referenceY;
        locked = false;
        changed = true;
      } else dy = 0;
    }
  } else parts = unlinkSelection(parts, selection);
  const dx = cursor.x - before.cursor.x;
  parts = parts.map((p) => {
    if (!selection.keys.includes(p.key)) return p;
    const y = p.y + (before.symmetric && !onSide.get(p.key) ? -dy : dy);
    // Browser client coordinates lose a few millionths under CSS stage scaling.
    return { ...p, x: p.x + dx, y: Math.abs(y) < 0.00001 ? 0 : y };
  });
  let nextTwin = before.nextTwin;
  if (changed && locked) {
    // DeleteNonDominantTwinObject: only merge selected pairs exactly on Y=0.
    for (const key of selection.keys) {
      const p = parts.find((p) => p.key === key);
      if (!p || p.y !== 0 || !p.twin || !selection.keys.includes(p.twin)) continue;
      const twin = parts.find((other) => other.key === p.twin);
      if (!twin) continue;
      const removed =
        selection.ghosts.includes(p.key) && !selection.ghosts.includes(twin.key) ? p.key : twin.key;
      parts = removeParts(parts, [removed]);
      selection = {
        keys: selection.keys.filter((k) => k !== removed),
        ghosts: selection.ghosts.filter((k) => k !== removed),
      };
      onSide.delete(removed);
    }
  } else if (changed && !locked) {
    const candidates = selection.keys.filter((key) => {
      const p = parts.find((p) => p.key === key);
      return p && (p.y - dy === 0 || p.y + dy === 0);
    });
    for (const key of candidates) {
      const index = parts.findIndex((p) => p.key === key),
        p = parts[index];
      if (!p || p.twin) continue;
      let twinKey: string;
      do {
        twinKey = `${key}-twin-${nextTwin++}`;
      } while (parts.some((p) => p.key === twinKey));
      const rotation = ((((-p.rotation + 180) % 360) + 360) % 360) - 180;
      const twin = { ...p, key: twinKey, twin: key, y: -p.y, rotation };
      parts = [...parts.slice(0, index), { ...p, twin: twinKey }, twin, ...parts.slice(index + 1)];
      selection = { keys: [...selection.keys, twinKey], ghosts: [...selection.ghosts, twinKey] };
      onSide.set(twinKey, !onSide.get(key));
    }
  }
  return { ...before, parts, selection, onSide, cursor, referenceY, locked, nextTwin };
}
