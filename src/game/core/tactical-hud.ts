import { STAGE } from './constants';
import { HUD } from './hud';
import { angleTo, clamp } from './math';
import type { Tank, Vec } from './types';

export interface AllyHealthIndicator extends Vec {
  uid: number;
  width: number;
  frame: number;
}
export interface EnemyHealthIndicator extends Vec {
  kind: 'health';
  uid: number;
  width: number;
  fill: number;
}
export interface RadarIndicator {
  kind: 'radar';
  uid: number;
  angle: number;
}
export const stagePoint = (point: Vec, avatar: Vec, zoom = 1): Vec => ({
  x: STAGE.cx + (point.x - avatar.x) * zoom,
  y: STAGE.cy + (point.y - avatar.y) * zoom,
});
export const enemyHealthWidth = (classId: number) => (classId * 20 > 120 ? 100 : classId * 20);
export const allyHealthFrame = (life: number, maxLife: number) =>
  clamp(101 - Math.trunc((life / maxLife) * 100), 1, HUD.tactical.allyLife.frames);
function allyIndicator(ally: Tank, avatar: Vec, zoom: number): AllyHealthIndicator {
  return {
    uid: ally.uid,
    ...stagePoint(ally, avatar, zoom),
    width: ally.radius * 2.1,
    frame: allyHealthFrame(ally.life, ally.maxLife),
  };
}

/** Fixed-stage snapshots: ally rings follow the interface clock, passive readouts follow Avatar.Run. */
export class TacticalHudState {
  allies: AllyHealthIndicator[] = [];
  passives: (EnemyHealthIndicator | RadarIndicator)[] = [];

  updateAllies(allies: readonly Tank[], avatar: Vec, zoom = 1) {
    this.allies = allies
      .filter((ally) => !ally.dead)
      .map((ally) => allyIndicator(ally, avatar, zoom));
  }
  includeNewAllies(allies: readonly Tank[], avatar: Vec, zoom = 1) {
    // Newly summoned allies exist before _-GW; retain older allies' pre-field-run snapshots.
    const known = new Set(this.allies.map((ally) => ally.uid));
    for (const ally of allies)
      if (!ally.dead && !known.has(ally.uid)) this.allies.push(allyIndicator(ally, avatar, zoom));
  }
  updatePassives(avatar: Tank, enemies: readonly Tank[], zoom = 1, controlsPaused = false) {
    // Stun skips _-Ta entirely. Jam instead calls FinalPartCall to remove both readouts.
    if (avatar.stunned) return;
    this.passives = [];
    if (avatar.status.jam > 0) return;
    // RegisterPassivePart deduplicates blnInterface parts, preserving their first mounted order.
    const registered = new Set<number>();
    for (const part of avatar.design.parts) {
      if (![5001, 5002].includes(part.type) || registered.has(part.type)) continue;
      registered.add(part.type);
      for (const enemy of enemies) {
        if (enemy.dead) continue;
        const point = stagePoint(enemy, avatar, zoom);
        if (part.type === 5002) {
          if (controlsPaused) continue; // _-Yb.Run explicitly clears its bars in world state3.
          this.passives.push({
            kind: 'health',
            uid: enemy.uid,
            x: point.x,
            y: point.y - 10 - enemy.radius,
            width: enemyHealthWidth(enemy.design.classId),
            fill: enemy.life / enemy.maxLife,
          });
        } else if (
          Math.abs(point.x - STAGE.cx) > STAGE.cx ||
          Math.abs(point.y - STAGE.cy) > STAGE.cy
        ) {
          this.passives.push({ kind: 'radar', uid: enemy.uid, angle: angleTo(avatar, enemy) });
        }
      }
    }
  }
  clearPassives() {
    this.passives = [];
  }
  clear() {
    this.allies = [];
    this.passives = [];
  }
}
