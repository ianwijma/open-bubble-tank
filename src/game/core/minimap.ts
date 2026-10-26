import geometry from '../data/minimap-geometry.json';
import type { Field, Vec } from './types';
export const MINIMAP = geometry;
export type MapMode = 1 | 2 | 3;
export const nextMapMode = (mode: MapMode): MapMode => (mode === 3 ? 1 : ((mode + 1) as MapMode));
export const mapModeName = (mode: MapMode) => ['Compact', 'Large', 'Hidden'][mode - 1];
export const mapCenter = (state: { field: Field; transit: { next: Field } | null }) =>
  state.transit?.next ?? state.field;
export function mapDotFrame(field: Pick<Field, 'col' | 'row' | 'cleared' | 'destroyed'>) {
  return field.destroyed ? 2 : field.cleared && (field.col !== 0 || field.row !== 0) ? 3 : 1;
}
export function mapPoint(
  cell: { col: number; row: number },
  center: { col: number; row: number },
  mode: MapMode,
): Vec {
  const layout = geometry.modes[mode - 1];
  return {
    x: geometry.origin.x + layout.center.x + (cell.col - center.col) * 25 * layout.scale,
    y: geometry.origin.y + layout.center.y + (cell.row - center.row) * 25 * layout.scale,
  };
}
