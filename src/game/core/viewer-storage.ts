import type { TankDesign } from './types';

/** TankViewerScreen._-6G: IDs and tank statistics are not part of save identity. */
export const viewerTankIdentity = (tank: TankDesign) =>
  JSON.stringify([
    tank.author,
    tank.name,
    tank.parts.map((p) => [p.key, p.type, p.twin, p.x, p.y, p.rotation, p.scale, p.radius]),
  ]);
export const sameViewerTank = (a: TankDesign, b: TankDesign) =>
  viewerTankIdentity(a) === viewerTankIdentity(b);
/** The source scans only the current avatar/enemy profile list. */
export const viewerTankExists = (tanks: readonly TankDesign[], tank: TankDesign) =>
  tanks.some((saved) => saved.avatar === tank.avatar && sameViewerTank(saved, tank));

export function appendViewerTank(tanks: TankDesign[], tank: TankDesign) {
  return viewerTankExists(tanks, tank) ? tanks : [...tanks, tank];
}
/** _-2a hides the first matching local entry, rather than all entries sharing its ID. */
export function removeViewerTank(tanks: TankDesign[], tank: TankDesign) {
  const index = tanks.findIndex(
    (saved) => saved.avatar === tank.avatar && sameViewerTank(saved, tank),
  );
  return index < 0 ? tanks : [...tanks.slice(0, index), ...tanks.slice(index + 1)];
}
