import { FIELD_RADIUS, STAGE } from '../../src/game/core/constants';
import { direction, distance } from '../../src/game/core/math';
import type { InputFrame, TankDesign, Vec } from '../../src/game/core/types';
import { WEAPONS } from '../../src/game/data/weapons';
import { World, emptyInput } from '../../src/game/simulation/world';

/** Test pilot observes state but can only issue ordinary controls and offered upgrade choices. */
export class PlaythroughPilot {
  private route?: Vec;
  private fieldKey = '';
  upgrades: { level: number; id: string; classId: number }[] = [];
  helpClosed = 0;

  private choose(offers: TankDesign[]) {
    const score = (tank: TankDesign) => {
      const damage = tank.parts.reduce((total, part) => {
        const gun = WEAPONS[part.type];
        return (
          total +
          (gun
            ? (gun.damage * (gun.parallel ?? gun.angles?.length ?? 1)) / Math.max(1, gun.rate)
            : 0)
        );
      }, 0);
      return (
        damage +
        (tank.parts.some((p) => p.type === 3010) ? 0.4 : 0) -
        Math.max(0, tank.classId - 3) * 2
      );
    };
    return [...offers].sort((a, b) => score(b) - score(a))[0];
  }

  private nextExit(world: World): Vec {
    const queue = [{ col: world.field.col, row: world.field.row, first: { x: 0, y: 0 } }];
    const seen = new Set<string>();
    for (let index = 0; index < queue.length; index++) {
      const cell = queue[index];
      const options = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      ].sort(
        (a, b) =>
          Math.hypot(cell.col + a.x, cell.row + a.y) - Math.hypot(cell.col + b.x, cell.row + b.y),
      );
      for (const step of options) {
        const col = cell.col + step.x,
          row = cell.row + step.y,
          key = `${col},${row}`;
        const first = index === 0 ? step : cell.first;
        if (!world.fields.has(key)) return first;
        if (seen.has(key) || !world.fields.get(key)!.cleared) continue;
        seen.add(key);
        queue.push({ col, row, first });
      }
    }
    throw new Error('No reachable unexplored field');
  }

  input(world: World): InputFrame {
    if (world.mode === 'upgrade') {
      const selected = this.choose(world.offers);
      this.upgrades.push({
        level: world.progression.level,
        id: selected.id,
        classId: selected.classId,
      });
      world.selectUpgrade(selected);
    }
    if (world.mode === 'secondary-help') {
      this.helpClosed++;
      world.closeSecondaryHelp();
    }
    const input = emptyInput(),
      player = world.player;
    if (world.mode !== 'playing') return input;
    const targets = world.field.enemies.filter((enemy) => !enemy.dead);
    const target = targets.sort((a, b) => distance(player, a) - distance(player, b))[0];
    let movement = { x: 0, y: 0 };
    const radius = FIELD_RADIUS * world.field.scale;
    if (target) {
      this.route = undefined;
      const dx = target.x - player.x,
        dy = target.y - player.y,
        gap = Math.hypot(dx, dy) || 1;
      const approach = Math.max(-1, Math.min(1, (gap - 200) / 90));
      movement = {
        x: (dx / gap) * approach - (dy / gap) * 0.8,
        y: (dy / gap) * approach + (dx / gap) * 0.8,
      };
      for (const other of targets) {
        const d = distance(player, other) || 1;
        if (d < 120) {
          movement.x += (((player.x - other.x) / d) * (120 - d)) / 35;
          movement.y += (((player.y - other.y) / d) * (120 - d)) / 35;
        }
      }
      const lead = direction(target.rotation, target.design.speed * Math.min(30, gap / 10));
      input.aim = { x: STAGE.cx + dx + lead.x, y: STAGE.cy + dy + lead.y };
      input.fire = input.secondary = true;
      const radial = Math.hypot(player.x, player.y);
      if (radial > radius - 90) {
        movement.x -= ((player.x / radial) * (radial - radius + 90)) / 25;
        movement.y -= ((player.y / radial) * (radial - radius + 90)) / 25;
      }
    } else if (!world.pickups.length && world.field.cleared) {
      const key = `${world.field.col},${world.field.row}`;
      if (!this.route || this.fieldKey !== key) {
        this.route = this.nextExit(world);
        this.fieldKey = key;
      }
      movement = {
        x: this.route.x * (radius + 70) - player.x,
        y: this.route.y * (radius + 70) - player.y,
      };
      const d = Math.hypot(movement.x, movement.y) || 1;
      movement.x /= d;
      movement.y /= d;
    }
    for (const bullet of world.bullets) {
      if (!bullet.enemy || bullet.dead || distance(player, bullet) > 220) continue;
      const velocity = bullet.motion ?? direction(bullet.angle, bullet.speed);
      const vx = velocity.x - player.velocity.x,
        vy = velocity.y - player.velocity.y;
      const dx = player.x - bullet.x,
        dy = player.y - bullet.y;
      const t = Math.max(0, Math.min(15, (dx * vx + dy * vy) / (vx * vx + vy * vy || 1)));
      const near = { x: dx - vx * t, y: dy - vy * t },
        gap = Math.hypot(near.x, near.y) || 1;
      const danger = player.radius + 12;
      if (gap < danger) {
        movement.x += (((near.x / gap) * (danger - gap)) / danger) * 3;
        movement.y += (((near.y / gap) * (danger - gap)) / danger) * 3;
      }
    }
    // Hold the battle inside the field even when a dense volley overwhelms avoidance.
    // Source deliberately suppresses the win screen when completion happens during transit.
    const radial = Math.hypot(player.x, player.y);
    if ((target || !world.field.cleared) && radial > radius - 50)
      movement = { x: -player.x / radial, y: -player.y / radial };
    input.left = movement.x < -0.2;
    input.right = movement.x > 0.2;
    input.up = movement.y < -0.2;
    input.down = movement.y > 0.2;
    return input;
  }
}
