import { BULLET_RADIUS } from '../core/constants';
import { angleTo, direction, distance, length, rotate } from '../core/math';
import type { Projectile, Tank, Vec } from '../core/types';
import { tankHitLocation } from './hit-location';
import type { World } from './world';

interface SapperState {
  movement: Vec;
  forcedContact: boolean;
  master?: Tank;
  maximumLife?: number;
}
const states = new WeakMap<Projectile, SapperState>();
const attachedTanks = (world: World) => [...world.field.enemies, ...world.allies];

function steer(world: World, bullet: Projectile, state: SapperState) {
  let destination: Vec | undefined;
  if (!bullet.returning) destination = tankHitLocation(world.player);
  else {
    const master = state.master ?? attachedTanks(world).find((tank) => tank.uid === bullet.owner);
    if (master && bullet.anchor) {
      const offset = rotate(bullet.anchor.part, master.rotation);
      destination = { x: master.x + offset.x, y: master.y + offset.y };
    }
  }
  bullet.angle = destination ? angleTo(bullet, destination) : 0;
  if (destination && distance(bullet, destination) < 5) state.forcedContact = true;
  state.movement = direction(bullet.angle, bullet.speed);
}

/** _-Jp constructor stops on frame3; base Setup immediately steers toward the avatar. */
export function initializeSapper(world: World, bullet: Projectile) {
  if (bullet.kind !== 'sapper' || states.has(bullet)) return;
  const state: SapperState = { movement: { x: 0, y: 0 }, forcedContact: false };
  states.set(bullet, state);
  bullet.returning = false;
  bullet.artFrame = 3;
  steer(world, bullet, state);
}

/** _-Jp: wall, steering, master/shot/target contact, then the pre-contact movement. */
export function tickSapper(world: World, bullet: Projectile) {
  initializeSapper(world, bullet);
  const state = states.get(bullet)!;
  const impact = () => world.addCombatEffect(bullet, 'impact');
  if (length(bullet) > BULLET_RADIUS * world.field.scale) {
    impact();
    bullet.dead = true;
    return;
  }
  steer(world, bullet, state);
  if (!state.master) {
    state.master = attachedTanks(world).find((tank) => tank.uid === bullet.owner);
    state.maximumLife = state.master?.life;
  }
  const master = state.master;
  if (!master || !attachedTanks(world).includes(master)) {
    impact();
    bullet.dead = true;
    return;
  }
  const half = { x: bullet.x - state.movement.x / 2, y: bullet.y - state.movement.y / 2 };
  for (const incoming of world.bullets) {
    if (
      !incoming.enemy &&
      (world.hitProjectile(incoming, bullet.x, bullet.y) ||
        world.hitProjectile(incoming, half.x, half.y))
    ) {
      impact();
      bullet.dead = true;
      return;
    }
  }
  const target = bullet.returning ? master : world.player;
  if (
    state.forcedContact ||
    world.hitTest(target, bullet.x, bullet.y) ||
    world.hitTest(target, half.x, half.y)
  ) {
    if (bullet.returning) master.life = Math.min(master.life + 2, state.maximumLife!);
    else {
      impact();
      if (world.player.shield > 0) {
        bullet.dead = true;
        return;
      }
      world.damage(world.player, bullet.damage, bullet);
    }
    bullet.returning = !bullet.returning;
    bullet.targetId = bullet.returning ? master.uid : world.player.uid;
    bullet.artFrame = bullet.returning ? 2 : 3;
    world.projectileTimelines.hold(bullet, bullet.artFrame);
    state.forcedContact = false;
  }
  bullet.x += state.movement.x;
  bullet.y += state.movement.y;
}
