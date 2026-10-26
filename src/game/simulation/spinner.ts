import { BULLET_RADIUS } from '../core/constants';
import { direction, length } from '../core/math';
import type { Projectile, Tank } from '../core/types';
import { createProjectile } from './create-projectile';
import type { World } from './world';

const clocks = new WeakMap<Projectile, { counter: number; angle: number }>();

/** _-V3: its collision return is ignored, so contact neither stops nor consumes it. */
export function tickSpinner(world: World, b: Projectile) {
  if (length(b) > BULLET_RADIUS * world.field.scale) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  let clock = clocks.get(b);
  if (!clock) clocks.set(b, (clock = { counter: 0, angle: 0 }));
  const velocity = direction(b.angle, b.speed);
  const radius = world.projectileWidth(b) / 2;
  if (++clock.counter === 5) {
    clock.counter = 0;
    clock.angle += 6;
    for (let a = clock.angle + 45; a < clock.angle + 405; a += 90) {
      const radial = direction(a, 10);
      const vx = velocity.x + radial.x,
        vy = velocity.y + radial.y;
      world.addBullet(
        createProjectile(world.nextId(), {
          owner: b.owner,
          enemy: true,
          kind: 'shell',
          symbol: 1717,
          // The original passes its degree-valued angle directly to Math.cos/sin here.
          x: b.x + radius * Math.cos(a),
          y: b.y + radius * Math.sin(a),
          angle: (Math.atan2(vy, vx) * 180) / Math.PI,
          speed: Math.hypot(vx, vy),
          damage: 1,
        }),
      );
    }
  }
  const samples = [
    { x: b.x, y: b.y },
    { x: b.x + radius, y: b.y },
    { x: b.x - radius, y: b.y },
    { x: b.x, y: b.y + radius },
    { x: b.x, y: b.y - radius },
  ];
  const hit = (tank: Tank) => samples.some((p) => world.hitTest(tank, p.x, p.y));
  // enemyLayer_mc holds enemies and allies, but not the avatar. Half-step cannot open it.
  if ([...world.field.enemies, ...world.allies].some((tank) => !tank.dead && hit(tank))) {
    for (const tank of [...world.allies, world.player]) {
      if (
        tank.dead ||
        (!hit(tank) && !world.hitTest(tank, b.x - velocity.x / 2, b.y - velocity.y / 2))
      )
        continue;
      world.addCombatEffect(b, 'impact');
      world.damage(tank, b.damage, b);
      b.hit.add(tank.uid);
      break;
    }
  }
  b.x += velocity.x;
  b.y += velocity.y;
}
