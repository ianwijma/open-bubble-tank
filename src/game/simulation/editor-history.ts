import type { TankPart } from '../core/types';

export type EditorSnapshots = readonly (readonly TankPart[])[];
const copy = (parts: readonly TankPart[]): TankPart[] => structuredClone([...parts]);

/** Setup records an empty snapshot; importing a tank appends the imported parts. */
export function initialEditorSnapshots(parts: readonly TankPart[]): EditorSnapshots {
  return parts.length ? [[], copy(parts)] : [[]];
}
/** The history has no cap and records accepted no-op operations too. */
export function appendEditorSnapshot(
  history: EditorSnapshots,
  parts: readonly TankPart[],
): EditorSnapshots {
  return [...history, copy(parts)];
}
export function acceptedEditorParts(history: EditorSnapshots): TankPart[] {
  return copy(history.at(-1) ?? []);
}
/** Undo restores the preceding accepted parts without rolling back enemy stat fields. */
export function undoEditorSnapshot(history: EditorSnapshots): EditorSnapshots {
  return history.length > 1 ? history.slice(0, -1) : history;
}
