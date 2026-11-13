import { BULLET_RADIUS } from '../core/constants';
import { direction, distance, length } from '../core/math';
import type { Field, Pickup, Vec } from '../core/types';
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
  field: Field = world.field,
) {
  for (const value of pickupValues(amount)) {
    const speed = world.rng.int(4, 22),
      rotation = world.rng.int(-180, 180);
    const velocity = direction(rotation, speed);
    // _-Pu's constructor draws speed; Spawn then writes pose, adds the child,
    // calls Setup and appends _-Ym. Frame1 registration timing is unresolved.
    const pickup: Pickup = {
      uid: world.nextId(),
      x: 0,
      y: 0,
      value: 1,
      rotation: 0,
      vx: velocity.x,
      vy: velocity.y,
      scattering: true,
      collected: false,
      forced: false,
      dead: false,
    };
    world.pickupDisplays.construct(pickup, value);
    pickup.x = pos.x;
    pickup.y = pos.y;
    pickup.rotation = rotation;
    world.pickupDisplays.attach(pickup, field);
    world.pickupDisplays.setup(pickup, value, field, world.player);
    into.push(pickup);
    if (forced) {
      pickup.forced = true;
      pickup.scattering = false;
    }
  }
}

/** Field collision runs before any pickup movement, even during scattering. */
export function collectPickups(world: World) {
  const runtime = world.runtimeFor(world.field);
  const contacts = world.pickups.filter(
    (pickup) =>
      !pickup.dead && (pickup.collected || world.hitTest(world.player, pickup.x, pickup.y)),
  );
  for (const pickup of contacts) {
    pickup.dead = true;
    healTank(world.player, pickup.value);
    world.stats.collected++;
    if (runtime.collectTimer === -1) {
      world.emit('collect');
      runtime.collectTimer = 4;
    }
    removePickup(world, pickup, world.field);
  }
}

/** _-8A / _-PL scan by reference; stale callback vectors cannot remove a different parent's child. */
function removePickup(world: World, pickup: Pickup, field: Field) {
  const vector = world.runtimeFor(field).pickups;
  const index = vector.indexOf(pickup);
  if (index === -1) return;
  vector.splice(index, 1);
  world.pickupDisplays.remove(pickup, field);
}

export function movePickup(world: World, pickup: Pickup) {
  // _-Pu consults currentBFTarget, which remains outgoing until promotion.
  if (length(pickup) > BULLET_RADIUS * world.currentWrapper.scale) {
    pickup.dead = true;
    const callbackField = world.pickupDisplays.read(pickup)?.callbackField;
    if (!callbackField) throw new Error('Pickup Run requires its original Setup callback');
    removePickup(world, pickup, callbackField);
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
  }
}
