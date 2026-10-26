import geometry from '../data/hud-geometry.json';
import type { GunState, Tank } from './types';
import { partById } from '../data/catalog';
import { WEAPONS } from '../data/weapons';

export const HUD = geometry;
export function weaponRows(tank: Pick<Tank, 'guns'>) {
  const rows = new Map<number, { gun: GunState; count: number; label: string; fill: number }>();
  for (const gun of tank.guns) {
    if (Math.floor(gun.part.type / 1000) !== 2) continue;
    const old = rows.get(gun.part.type);
    if (old) old.count++;
    else rows.set(gun.part.type, { gun, count: 1, label: '', fill: 0 });
  }
  for (const row of rows.values()) {
    const short = partById(row.gun.part.type)?.shortName ?? '';
    // AS3's substr(0, -2) removes the final two characters; native BC firing capture confirms it.
    row.label = row.count === 1 ? short.slice(0, -2) : short;
    const rate = WEAPONS[row.gun.part.type]?.rate ?? 1;
    row.fill = Math.max(0, Math.min(1, (rate - row.gun.counter) / rate));
  }
  return [...rows.values()];
}
export const secondaryRate = (tank: Pick<Tank, 'guns'>) =>
  Math.max(
    0,
    ...tank.guns
      .filter((g) => Math.floor(g.part.type / 1000) === 3)
      .map((g) => WEAPONS[g.part.type]?.rate ?? 40),
  );
export const fireLayout = (count: number) => HUD.fire.layouts[Math.max(0, Math.min(8, count - 1))];
export function firePanelHeight(tank: Pick<Tank, 'guns'>) {
  const layout = fireLayout(weaponRows(tank).length);
  return secondaryRate(tank) ? layout.secondaryHeight : layout.height;
}

export function hudReadout(tank: Tank, counter: number) {
  const rate = secondaryRate(tank);
  return {
    uid: tank.uid,
    life: tank.life,
    maxLife: tank.maxLife,
    name: tank.design.name,
    rows: weaponRows(tank),
    rate,
    secondaryFill: rate ? Math.max(0, Math.min(1, (rate - counter) / rate)) : 0,
  };
}
export type HudReadout = ReturnType<typeof hudReadout>;

/** AvatarInterface.InterfaceMotion, measured in original game frames, including crossings. */
export class HudState {
  lifeIdle = 75;
  fireIdle = 75;
  lifeY = HUD.life.y + 100;
  fireY = HUD.fire.y - 100;
  private lastLife: number | undefined;
  private snapshot?: HudReadout;
  capture(tank: Tank, secondaryCounter: number) {
    this.snapshot = hudReadout(tank, secondaryCounter);
  }
  readout(tank: Tank, secondaryCounter: number) {
    return this.snapshot?.uid === tank.uid ? this.snapshot : hudReadout(tank, secondaryCounter);
  }
  revealFire() {
    this.fireIdle = 0;
  }
  advance(life: number, fireHeight: number) {
    const lifeRest = HUD.life.y + 0.2;
    this.lifeY = 0.8 * this.lifeY + 0.2 * (lifeRest + (this.lifeIdle < 75 ? 0 : 100));
    this.fireY =
      0.8 * this.fireY + 0.2 * (HUD.fire.y - (this.fireIdle < 75 ? 0 : 100 + fireHeight));
    if (this.lifeIdle < 75) this.lifeIdle++;
    if (this.fireIdle < 75) this.fireIdle++;
    // _-MO follows InterfaceMotion: a changed life value reveals the following frame.
    if (this.lastLife !== life) this.lifeIdle = 0;
    this.lastLife = life;
  }
}
