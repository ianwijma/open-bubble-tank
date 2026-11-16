import type { TankDesign } from './types';

/** IDs and tank statistics are not part of save identity. */
export const viewerTankIdentity = (tank: TankDesign) =>
  JSON.stringify([
    tank.author,
    tank.name,
    tank.parts.map((p) => [p.key, p.type, p.twin, p.x, p.y, p.rotation, p.scale, p.radius]),
  ]);
export const sameViewerTank = (a: TankDesign, b: TankDesign) =>
  viewerTankIdentity(a) === viewerTankIdentity(b);
/** Only the current avatar/enemy profile list is scanned. */
export const viewerTankExists = (tanks: readonly TankDesign[], tank: TankDesign) =>
  tanks.some((saved) => saved.avatar === tank.avatar && sameViewerTank(saved, tank));

export function appendViewerTank(tanks: TankDesign[], tank: TankDesign) {
  return viewerTankExists(tanks, tank) ? tanks : [...tanks, tank];
}
/** Removal hides the first matching local entry, rather than all entries sharing its ID. */
export function removeViewerTank(tanks: TankDesign[], tank: TankDesign) {
  const index = tanks.findIndex(
    (saved) => saved.avatar === tank.avatar && sameViewerTank(saved, tank),
  );
  return index < 0 ? tanks : [...tanks.slice(0, index), ...tanks.slice(index + 1)];
}
