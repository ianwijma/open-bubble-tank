import type { TankPart, Vec } from '../core/types';

/** Transient creator state, never serialized into a tank code. */
export interface PartSelection {
  keys: string[];
  ghosts: string[];
}
export const emptySelection = (): PartSelection => ({ keys: [], ghosts: [] });

// TankCreatorScreen.SelectObject: selecting a mirrored part also selects its
// twin, moves that twin to the end of the selection, and fades it to 25%.
export function addSelection(
  parts: TankPart[],
  selection: PartSelection,
  key: string,
  symmetric: boolean,
): PartSelection {
  const part = parts.find((p) => p.key === key);
  if (!part || selection.keys.includes(key)) return selection;
  const twin = symmetric && parts.some((p) => p.key === part.twin) ? part.twin : '';
  return {
    keys: [...selection.keys.filter((k) => k !== twin), key, ...(twin ? [twin] : [])],
    ghosts: [...selection.ghosts.filter((k) => k !== key && k !== twin), ...(twin ? [twin] : [])],
  };
}
export function toggleSelection(
  parts: TankPart[],
  selection: PartSelection,
  key: string | undefined,
  symmetric: boolean,
): PartSelection {
  if (!key) return emptySelection();
  if (!selection.keys.includes(key)) return addSelection(parts, selection, key, symmetric);
  const twin = parts.find((p) => p.key === key)?.twin;
  return {
    keys: selection.keys.filter((k) => k !== key),
    ghosts: selection.ghosts.filter((k) => k !== key && k !== twin),
  };
}

// _-bp samples center, cardinal radius and half-radius points, in addition to
// the release pointer's alpha hit. Retain its duplicated positive half-Y test.
export function marqueeSelection(
  parts: TankPart[],
  selection: PartSelection,
  from: Vec,
  to: Vec,
  symmetric: boolean,
  hit: (part: TankPart, x: number, y: number) => boolean,
) {
  const inside = (x: number, y: number) =>
    x >= Math.min(from.x, to.x) &&
    x <= Math.max(from.x, to.x) &&
    y >= Math.min(from.y, to.y) &&
    y <= Math.max(from.y, to.y);
  let result = selection,
    found = false;
  for (const p of parts) {
    const r = p.radius * p.scale;
    if (
      hit(p, to.x, to.y) ||
      [
        [0, 0],
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r / 2, 0],
        [-r / 2, 0],
        [0, r / 2],
      ].some(([x, y]) => inside(p.x + x, p.y + y))
    ) {
      found = true;
      result = addSelection(parts, result, p.key, symmetric);
    }
  }
  return found ? result : emptySelection();
}

export function unlinkSelection(parts: TankPart[], selection: PartSelection) {
  const affected = new Set(
    parts.filter((p) => selection.keys.includes(p.key)).flatMap((p) => [p.key, p.twin]),
  );
  return parts.map((p) => (affected.has(p.key) ? { ...p, twin: '' } : p));
}
/** _-6z breaks a pair when only one member remains selected after editing. */
export function unlinkPartialSelection(parts: TankPart[], selection: PartSelection) {
  const partial = parts.filter(
    (p) => selection.keys.includes(p.key) && p.twin && !selection.keys.includes(p.twin),
  );
  return unlinkSelection(parts, { keys: partial.map((p) => p.key), ghosts: [] });
}
export function removeParts(parts: TankPart[], keys: string[]) {
  const removed = new Set(keys);
  return parts
    .filter((p) => !removed.has(p.key))
    .map((p) => (removed.has(p.twin) ? { ...p, twin: '' } : p));
}
export function transformSelection(
  parts: TankPart[],
  selection: PartSelection,
  change: { rotation?: number; scale?: number },
) {
  return parts.map((p) =>
    !selection.keys.includes(p.key)
      ? p
      : {
          ...p,
          ...(change.rotation === undefined
            ? {}
            : { rotation: p.y <= 0 ? change.rotation : -change.rotation }),
          ...(change.scale === undefined ? {} : { scale: change.scale }),
        },
  );
}
export function orderSelection(parts: TankPart[], selection: PartSelection, front: boolean) {
  const chosen = parts.filter((p) => selection.keys.includes(p.key)),
    other = parts.filter((p) => !selection.keys.includes(p.key));
  return front ? [...other, ...chosen] : [...chosen, ...other];
}

/** Left/Right controls change each selected X by one per frame, plus the release click. */
export function nudgeSelection(parts: TankPart[], selection: PartSelection, delta: number) {
  return parts.map((p) => (selection.keys.includes(p.key) ? { ...p, x: p.x + delta } : p));
}

/** _-F1 / DeleteNonDominantTwinObject: center selected objects and retain the opaque twin. */
export function centerSelection(parts: TankPart[], selection: PartSelection) {
  let result = parts.map((p) => ({ ...p })),
    keys = [...selection.keys];
  for (let i = 0; i < keys.length; i++) {
    const part = result.find((p) => p.key === keys[i]);
    if (!part) continue;
    part.y = 0;
    const twin = result.find((p) => p.key === part.twin && keys.includes(p.key));
    if (!twin) continue;
    const keep =
        selection.ghosts.includes(part.key) && !selection.ghosts.includes(twin.key) ? twin : part,
      remove = keep === part ? twin : part;
    keep.twin = '';
    result = result.filter((p) => p.key !== remove.key);
    keys = keys.filter((k) => k !== remove.key);
  }
  return {
    parts: result,
    selection: { keys, ghosts: selection.ghosts.filter((k) => keys.includes(k)) },
  };
}

/** Source slider initialization averages every selected clip, including faded twins. */
export function selectedTransform(parts: TankPart[], selection: PartSelection) {
  const selected = parts.filter((p) => selection.keys.includes(p.key));
  return selected.length
    ? {
        scale: selected.reduce((n, p) => n + p.scale, 0) / selected.length,
        rotation:
          selected.reduce((n, p) => n + (((p.rotation % 360) + 360) % 360), 0) / selected.length,
      }
    : { scale: 1, rotation: 0 };
}
