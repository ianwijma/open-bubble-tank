import { BULLET_RADIUS } from '../core/constants';
import { direction, distance, length } from '../core/math';
import type { Pickup, Vec } from '../core/types';
import { healTank } from './tank';
import type { World } from './world';

/** _-0D.SpawnLifeBubbles, including its shipped denomination quirks. */
export function pickupValues(amount: number) {
  amount |= 0;
  const values: number[] = [];
  const add = (count: number, value: number) => {
    for (let i = 0; i < count; i++) values.push(value);
  };
  if (amount < 5) add(amount, 1);
  else if (amount < 50) {
    const fives = Math.floor(amount / 5),
      remainder = amount % 5;
    // A nonzero remainder replaces the last five with five singles, in addition
    // to the remainder. The obfuscated decompiler's loop obscures this early exit.
    add(fives - (fives > 1 && remainder > 0 ? 1 : 0), 5);
    if (fives > 1 && remainder > 0) add(5, 1);
    add(remainder, 1);
  } else {
    add(Math.floor(amount / 50), 50);
    const fives = Math.floor((amount % 50) / 5);
    add(fives, 5);
    // Bytecode uses the five-count % 5, rather than the remaining value % 5.
    add(fives % 5, 1);
  }
  return values;
}

export function spawnPickups(
  world: World,
  pos: Vec,
  amount: number,
  into = world.pickups,
  forced = false,
) {
  for (const value of pickupValues(amount)) {
    const speed = world.rng.int(4, 22),
      rotation = world.rng.int(-180, 180);
    const velocity = direction(rotation, speed);
    into.push({
      uid: world.nextId(),
      x: pos.x,
      y: pos.y,
      value,
      rotation,
      vx: velocity.x,
      vy: velocity.y,
      scattering: true,
      collected: false,
      forced,
      dead: false,
    });
  }
}

/** Field collision runs before any pickup movement, even during scattering. */
export function collectPickups(world: World) {
  const runtime = world.runtimeFor(world.field);
  for (const pickup of world.pickups) {
    if (pickup.dead || (!pickup.collected && !world.hitTest(world.player, pickup.x, pickup.y)))
      continue;
    pickup.dead = true;
    healTank(world.player, pickup.value);
    world.stats.collected += pickup.value;
    if (runtime.collectTimer === -1) {
      world.emit('collect');
      runtime.collectTimer = 4;
    }
  }
  world.pickups = world.pickups.filter((pickup) => !pickup.dead);
}

export function movePickup(world: World, pickup: Pickup) {
  // _-Pu consults currentBFTarget, which remains outgoing until promotion.
  if (length(pickup) > BULLET_RADIUS * world.currentWrapper.scale) {
    pickup.dead = true;
    return;
  }
  if (pickup.forced) pickup.scattering = false;
  if (pickup.scattering) {
    pickup.vx *= 0.9;
    pickup.vy *= 0.9;
    pickup.x += pickup.vx;
    pickup.y += pickup.vy;
    if (Math.hypot(pickup.vx, pickup.vy) < 0.5) pickup.scattering = false;
  }
  if (pickup.scattering) return;
  const gap = distance(pickup, world.player);
  // Acquisition is always 100px. Class changes pull speed, not acquisition range.
  if (!pickup.forced && gap >= 100) return;
  if (gap < 10) pickup.collected = true;
  const speed = pickup.forced ? 14 : (1 - gap / (100 * world.player.design.classId ** 3)) * 7;
  if (gap) {
    pickup.vx = ((world.player.x - pickup.x) / gap) * speed;
    pickup.vy = ((world.player.y - pickup.y) / gap) * speed;
  } else pickup.vx = pickup.vy = 0;
  pickup.x += pickup.vx;
  pickup.y += pickup.vy;
}

export function tickPickups(world: World) {
  collectPickups(world);
  // Original removals splice the live vector: the following pickup waits one frame.
  for (let index = 0; index < world.pickups.length; index++) {
    const pickup = world.pickups[index];
    movePickup(world, pickup);
    if (pickup.dead) world.pickups.splice(index, 1);
  }
}
