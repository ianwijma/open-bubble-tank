import type { Projectile, Tank, Vec } from '../core/types';
import { actorAngle, actorDirection, actorHeading } from './actor-movement';
import { displayPixel } from '../core/display-values';
import { tankHitDetail } from './hit-location';
import { projectileImpact } from './effects';
import { projectileOutside } from './projectile-boundary';
import type { World } from './world';

export class HomingTargetReadError extends Error {}
const homing = (b: Projectile) => b.kind === 'orbital' || (b.kind === 'seeker' && b.enemy);
const size = (v: Vec) => Math.sqrt(v.x * v.x + v.y * v.y);

/** Source RotateTowardTarget does not require movTarget.parent to exist. */
function steer(world: World, b: Projectile) {
  const state = b.homing!,
    origin = world.actorParents.fieldGlobal(b, world.field);
  if (!state.target || !origin) {
    b.motion = actorDirection(0, b.speed);
    return; // The returned zero initializes motion, without writing rotation.
  }
  const target = world.actorParents.localToGlobal(state.target, tankHitDetail(state.target)),
    delta = { x: target.x - origin.x, y: target.y - origin.y };
  if (size(delta) < 5) state.close = true;
  const angle = actorHeading({ x: 0, y: 0 }, delta);
  b.angle = actorAngle(angle);
  b.motion = actorDirection(angle, b.speed);
}

/** SpawnNewBullet attaches/sets display properties before virtual Setup steering. */
export function initializeHomingProjectile(
  world: World,
  b: Projectile,
  home?: Tank,
  target?: Tank,
) {
  if (!homing(b) || b.homing) return;
  b.x = displayPixel(b.x);
  b.y = displayPixel(b.y);
  b.angle = actorAngle(b.angle);
  const tanks = world.allTanks();
  b.homing = {
    home: home ?? tanks.find((t) => t.uid === b.owner),
    target: target ?? tanks.find((t) => t.uid === b.targetId),
    avatar: world.player,
    close: false,
  };
  steer(world, b);
}

/** Inherited _-BL.Run refreshes objAvatar before MoveBullet, leaving movTarget alone. */
export function refreshHomingAvatar(world: World, b: Projectile) {
  initializeHomingProjectile(world, b);
  if (b.homing && !world.actorParents.hasParent(b.homing.avatar)) b.homing.avatar = world.player;
}

function orbit(world: World, b: Projectile, home: Tank) {
  const center = world.actorParents.point(home, world.field);
  if (!center) throw new HomingTargetReadError('Orbital read its home parent');
  const delta = { x: center.x - b.x, y: center.y - b.y };
  if (delta.x * delta.x + delta.y * delta.y > Math.pow(home.radius + 20, 2)) {
    const heading = actorHeading({ x: 0, y: 0 }, actorDirection(b.angle, 1));
    let turn = actorHeading({ x: 0, y: 0 }, delta) - heading;
    if (turn > 180) turn -= 360;
    else if (turn < -180) turn += 360;
    if (Math.abs(turn) < 15) return;
    b.angle = actorAngle(b.angle + turn / 20);
    b.motion = actorDirection(b.angle, b.speed);
  } else {
    b.angle = actorAngle(b.angle + 5);
    const offset = actorDirection(b.angle - 90, home.radius + 10);
    b.x = displayPixel(center.x + offset.x);
    b.y = displayPixel(center.y + offset.y);
    // The near branch retains moveX/moveY, including Setup's horizontal vector.
  }
}

const candidates = (world: World, b: Projectile) =>
  b.enemy ? [b.homing!.avatar, ...world.allies] : [...world.field.enemies];

function acquire(world: World, b: Projectile) {
  const point = world.actorParents.fieldGlobal(b, world.field);
  if (!point) throw new HomingTargetReadError('Orbital read its projectile parent');
  for (const tank of candidates(world, b)) {
    if (!world.actorParents.hasParent(tank))
      throw new HomingTargetReadError('Orbital acquisition read an unparented candidate');
    const center = world.actorParents.localToGlobal(tank, { x: 0, y: 0 }),
      delta = { x: center.x - point.x, y: center.y - point.y };
    if (size(delta) - tank.radius < 100) {
      b.homing!.target = tank;
      b.targetId = tank.uid; // Compatibility metadata; the stored object owns selection.
      return;
    }
  }
}

function contact(world: World, b: Projectile) {
  const state = b.homing!,
    motion = b.motion!;
  // This subclass retry follows steering. Usually base Run already refreshed
  // objAvatar, so it does not replace the separately retained movTarget.
  if (b.kind === 'seeker' && !world.actorParents.hasParent(state.avatar)) {
    state.avatar = state.target = world.player;
    b.targetId = world.player.uid;
  }
  const point = world.actorParents.fieldGlobal(b, world.field);
  if (!point) throw new HomingTargetReadError('Homing contact read its projectile parent');
  const at = (offset: number) =>
    world.actorParents.fieldLocal(
      {
        x: point.x + motion.x * offset,
        y: point.y + motion.y * offset,
      },
      world.field,
    )!;
  for (const shot of world.bullets)
    if (
      shot.enemy !== b.enemy &&
      [0, -0.5, 0.5].some((offset) => {
        const p = at(offset);
        return world.hitProjectile(shot, p.x, p.y);
      })
    ) {
      projectileImpact(world, b);
      return true;
    }
  for (const tank of b.kind === 'seeker' ? [state.avatar] : candidates(world, b)) {
    const center = world.actorParents.point(tank, world.field);
    const hit = (offset: number) => {
      if (!center || !world.actorParents.onStage(tank)) return false;
      const p = at(offset);
      return world.hitTest(tank, p.x + tank.x - center.x, p.y + tank.y - center.y);
    };
    if (state.close || hit(0) || hit(-0.5)) {
      projectileImpact(world, b);
      world.damage(tank, b.damage, b);
      return true;
    }
  }
  return false;
}

/** _-QM/_-JX MoveBullet: home/wipe, wall, steering/orbit+acquire, contact, separate writes. */
export function tickHomingProjectile(world: World, b: Projectile) {
  initializeHomingProjectile(world, b);
  const state = b.homing!;
  if (
    (b.kind === 'orbital' && (!state.home || !world.actorParents.hasParent(state.home))) ||
    b.wipe
  ) {
    projectileImpact(world, b);
    b.dead = true;
    return;
  }
  if (projectileOutside(world, b)) {
    world.addCombatEffect(b, 'impact');
    b.dead = true;
    return;
  }
  if (b.kind === 'seeker' || (state.target && world.actorParents.hasParent(state.target)))
    steer(world, b);
  else {
    orbit(world, b, state.home!);
    acquire(world, b);
  }
  if (contact(world, b)) {
    b.dead = true;
    return;
  }
  b.x = displayPixel(b.x + b.motion!.x);
  b.y = displayPixel(b.y + b.motion!.y);
}
