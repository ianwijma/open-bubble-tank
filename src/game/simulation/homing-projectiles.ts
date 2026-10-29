import { angleTo, direction, distance } from '../core/math';
import type { Projectile, Tank } from '../core/types';
import { actorTargetPoint, attachedTarget } from './actor-targets';
import { projectileImpact } from './effects';
import { tankHitLocation } from './hit-location';
import { projectileOutside } from './projectile-boundary';
import type { World } from './world';

const isHoming = (b: Projectile) => b.kind === 'orbital' || (b.kind === 'seeker' && b.enemy);
const attached = (world: World, tank?: Tank) =>
  tank !== undefined && attachedTarget(world, tank.uid) === tank;

function hitPoint(world: World, tank: Tank) {
  const center = actorTargetPoint(world, tank),
    hit = tankHitLocation(tank);
  return { x: center.x + hit.x - tank.x, y: center.y + hit.y - tank.y };
}

/** _-QM/_-JX latch _-Pk; a later turn never clears the <5px contact. */
function steer(world: World, b: Projectile) {
  const state = b.homing!;
  if (!state.target) {
    b.motion = direction(0, b.speed); // RotateTowardTarget returns0 without changing rotation.
    return;
  }
  const point = hitPoint(world, state.target);
  if (distance(b, point) < 5) state.close = true;
  b.angle = angleTo(b, point);
  b.motion = direction(b.angle, b.speed);
}

/** Base Setup calls the subclass steering method before the first MoveBullet. */
export function initializeHomingProjectile(world: World, b: Projectile) {
  if (!isHoming(b) || b.homing) return;
  b.homing = {
    home: attachedTarget(world, b.owner),
    target: attachedTarget(world, b.targetId),
    avatar: world.player,
    close: false,
  };
  steer(world, b);
}

function rotation(angle: number) {
  const value = angle % 360;
  return value > 180 ? value - 360 : value < -180 ? value + 360 : value;
}

/** _-JX._-Hz changes movement only in the distant, >=15-degree branch. */
function orbit(world: World, b: Projectile, home: Tank) {
  const center = actorTargetPoint(world, home);
  if (distance(b, center) > home.radius + 20) {
    let delta = angleTo(b, center) - b.angle;
    if (delta > 180) delta -= 360;
    else if (delta < -180) delta += 360;
    if (Math.abs(delta) < 15) return;
    b.angle = rotation(b.angle + delta / 20);
    b.motion = direction(b.angle, b.speed);
  } else {
    b.angle = rotation(b.angle + 5);
    const offset = direction(b.angle - 90, home.radius + 10);
    b.x = center.x + offset.x;
    b.y = center.y + offset.y;
    // This branch deliberately retains moveX/moveY from Setup or the previous pursuit.
  }
}

function targets(world: World, b: Projectile) {
  return b.enemy ? [b.homing!.avatar, ...world.allies] : [...world.field.enemies];
}

/** _-QM and _-JX use three projectile points, then current/backward tank points. */
function contact(world: World, b: Projectile) {
  const state = b.homing!;
  if (b.kind === 'seeker' && !attached(world, state.avatar)) {
    state.avatar = state.target = world.player;
    b.targetId = world.player.uid;
  }
  const motion = b.motion!;
  for (const shot of world.bullets)
    if (
      shot.enemy !== b.enemy &&
      [0, -0.5, 0.5].some((offset) =>
        world.hitProjectile(shot, b.x + motion.x * offset, b.y + motion.y * offset),
      )
    ) {
      projectileImpact(world, b);
      return true; // The intercepting shot is left intact, without its callback.
    }
  const candidates = b.kind === 'seeker' ? [state.avatar] : targets(world, b);
  for (const tank of candidates)
    if (
      state.close ||
      world.hitTest(tank, b.x, b.y) ||
      world.hitTest(tank, b.x - motion.x / 2, b.y - motion.y / 2)
    ) {
      projectileImpact(world, b);
      world.damage(tank, b.damage, b);
      return true;
    }
  return false;
}

export function tickHomingProjectile(world: World, b: Projectile) {
  initializeHomingProjectile(world, b);
  const state = b.homing!;
  if ((b.kind === 'orbital' && !attached(world, state.home)) || b.wipe) {
    projectileImpact(world, b);
    b.dead = true;
    return;
  }
  if (projectileOutside(world, b)) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  if (b.kind === 'seeker' || attached(world, state.target)) steer(world, b);
  else {
    orbit(world, b, state.home!);
    // Acquisition follows orbiting, and the selected tank is aimed at next frame.
    const target = targets(world, b).find(
      (tank) => distance(b, actorTargetPoint(world, tank)) - tank.radius < 100,
    );
    if (target) {
      state.target = target;
      b.targetId = target.uid;
    }
  }
  if (contact(world, b)) {
    b.dead = true;
    return;
  }
  b.x += b.motion!.x;
  b.y += b.motion!.y;
}
