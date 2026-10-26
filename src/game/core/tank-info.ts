import { CLASS_ARMOR, CLASS_SPEED } from './constants';
import type { TankDesign } from './types';
import { partById } from '../data/catalog';
import { HUD } from './hud';

export const TANK_INFO = HUD.tankInfo;

/** PauseMenu._-Bz: sort IDs, then abbreviate each category independently. */
export function infoWeapons(tank: TankDesign, category: 2 | 3 | 5) {
  const counts = new Map<number, number>();
  for (const part of tank.parts)
    if (Math.floor(part.type / 1000) === category)
      counts.set(part.type, (counts.get(part.type) ?? 0) + 1);
  return (
    [...counts]
      .sort(([a], [b]) => a - b)
      .map(([id, count]) => {
        const part = partById(id);
        if (!part) return String(id);
        if (counts.size > 2)
          return count === 1 ? `1 ${part.shortName.slice(0, -2)}` : `${count} ${part.shortName}`;
        return count === 1 ? part.name : `${count} ${part.pluralName}`;
      })
      .join(', ') || 'N/A'
  );
}

export function tankInfoFields(tank: TankDesign): Record<string, string> {
  const index = tank.classId - 1;
  return {
    txtClass_txt: String(tank.classId),
    txtSpeed_txt: String(CLASS_SPEED[index]),
    txtArmor_txt: `${Math.round(CLASS_ARMOR[index] * 100)}%`,
    txtPrimaryWeapons_txt: infoWeapons(tank, 2),
    txtSecondaryWeapons_txt: infoWeapons(tank, 3),
    txtPassiveWeapons_txt: infoWeapons(tank, 5),
  };
}

/** Authored 50fps-frame easing, with the original sequential entrance gates. */
export class TankInfoMotion {
  positions = Object.fromEntries(TANK_INFO.pieces.map((p) => [p.name, { x: p.x, y: p.y }]));
  exiting = false;
  constructor() {
    const p = this.positions,
      out = TANK_INFO.out;
    p.Title_mc.y = p.ClassHealth_mc.y = out.ButtonTopOut_mc.y;
    for (const name of [
      'PrimaryWeapons_mc',
      'SecondaryWeapons_mc',
      'PassiveWeapons_mc',
      'btnBack_mc',
    ])
      p[name].x = out.ButtonLeftOut_mc.x;
    p.TankImage_mc.x = out.ButtonTankOut_mc.x;
  }
  private approach(name: string, axis: 'x' | 'y', target?: number, rate = 0.1) {
    const pos = this.positions[name];
    pos[axis] =
      pos[axis] * (1 - rate) +
      (target ?? TANK_INFO.pieces.find((p) => p.name === name)![axis]) * rate;
  }
  advance() {
    const p = this.positions,
      out = TANK_INFO.out;
    if (this.exiting) {
      for (const name of ['Title_mc', 'ClassHealth_mc'])
        this.approach(name, 'y', out.ButtonTopOut_mc.y, 0.07);
      this.approach('TankImage_mc', 'x', out.ButtonTankOut_mc.x, 0.07);
      for (const name of [
        'PrimaryWeapons_mc',
        'SecondaryWeapons_mc',
        'PassiveWeapons_mc',
        'btnBack_mc',
      ])
        this.approach(name, 'x', out.ButtonLeftOut_mc.x, 0.07);
      return;
    }
    this.approach('Title_mc', 'y');
    if (p.Title_mc.y > 10) this.approach('ClassHealth_mc', 'y');
    if (p.ClassHealth_mc.y > 10) this.approach('TankImage_mc', 'x');
    if (p.TankImage_mc.x < 500) this.approach('PrimaryWeapons_mc', 'x');
    if (p.PrimaryWeapons_mc.x > 30) this.approach('SecondaryWeapons_mc', 'x');
    if (p.SecondaryWeapons_mc.x > 30) this.approach('PassiveWeapons_mc', 'x');
    if (p.PassiveWeapons_mc.x > 30) this.approach('btnBack_mc', 'x');
  }
  get finished() {
    return (
      this.exiting &&
      TANK_INFO.pieces.every((piece) => {
        if (piece.name === 'TankImage_mc') return true; // Avatar returns to the world immediately.
        const p = this.positions[piece.name],
          b = piece.bounds;
        return (
          p.x + b.x + b.width <= 0 ||
          p.y + b.y + b.height <= 0 ||
          p.x + b.x >= 550 ||
          p.y + b.y >= 450
        );
      })
    );
  }
}

/** Flash wraps at spaces; an unbroken name may also exceed a line's width. */
export function infoTextLines(text: string, width: number, measure: (text: string) => number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
