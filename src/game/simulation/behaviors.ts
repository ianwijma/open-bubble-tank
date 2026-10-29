import type { GunState, Tank } from '../core/types';
import { angleTo, direction, distance, length, Random } from '../core/math';
import { actorAngle } from './ai';
import type { World } from './world';
import { acquireWeaponTarget, weaponTarget } from './weapon-targets';
import { actorTargetPoint } from './actor-targets';

/** Constructors/Setup retain one registered behavior of each ID, in authored part order. */
export function initializeTankWeapons(tank: Tank, world?: World) {
  const rng = world?.rng ?? new Random(tank.uid || 1);
  for (const gun of tank.guns) {
    const id = gun.part.type;
    if (tank.side === 'player') continue;
    gun.targeting = { targetId: null, allies: 0 };
    if (id >= 6000 && id < 7000) gun.behavior = gun.targeting;
    if (id === 6003) tank.movement.skittish = true;
    if (id === 6004) gun.behavior!.cloak = rng.int(0, 50);
    if (id === 6005)
      gun.behavior!.wall = { age: 0, frequency: rng.int(2, 10) / 100, amplitude: rng.int(10, 20) };
    if (world && ![4022, 4026, 4032].includes(id)) acquireWeaponTarget(world, tank, gun);
  }
}
export function tickBehavior(world: World, tank: Tank, gun: GunState) {
  const id = gun.part.type;
  if (!gun.behavior) return;
  const state = gun.behavior,
    target = weaponTarget(world, gun),
    point = target ? actorTargetPoint(world, target) : null,
    movement = tank.movement;
  if (id === 6001 || id === 6002) {
    movement.swarmPoint = point;
  } else if (id === 6003) {
    if (!point || distance(tank, point) > 600) {
      movement.swarmPoint = null;
      return;
    }
    const toTarget = angleTo(tank, point);
    let facing = toTarget - tank.rotation;
    // Source's >180 branch assigns another local, leaving facing unchanged.
    if (facing < -180) facing += 360;
    if (Math.abs(facing) > 90) return; // A previously chosen point is retained.
    const outward = actorAngle(angleTo({ x: 0, y: 0 }, tank) - tank.rotation),
      offset = world.rng.int(90, 110);
    movement.swarmPoint = direction(toTarget + (outward > 0 ? offset : -offset), 700);
  } else if (id === 6004) {
    state.cloak!++;
    if (state.cloak! <= 50 && tank.alpha > 0) tank.alpha -= 0.02;
    else if (state.cloak! > 150 && state.cloak! <= 200 && tank.alpha < 1) tank.alpha += 0.02;
    else if (state.cloak === 300) state.cloak = 0;
  } else if (id === 6005) {
    const wall = state.wall!;
    if (!wall.point) {
      movement.wallFlower = true;
      if (tank.x === 0 && tank.y === 0) tank.x = 1;
      wall.radius = 424 * world.currentWrapper.scale - tank.radius;
      wall.point = {
        x: (tank.x * wall.radius) / length(tank),
        y: (tank.y * wall.radius) / length(tank),
      };
      wall.direction = actorAngle(angleTo({ x: 0, y: 0 }, wall.point) - tank.rotation) < 0 ? 1 : -1;
      movement.swarmPoint = { ...wall.point };
      return;
    }
    wall.age++;
    if (distance(wall.point, tank) > 30 + tank.radius) return;
    wall.point = direction(
      angleTo({ x: 0, y: 0 }, wall.point) + wall.direction!,
      wall.radius! - Math.sin(wall.frequency * wall.age) * wall.amplitude,
    );
    movement.swarmPoint = { ...wall.point };
  }
}
