import type { DecoratedStatus, Status, Tank } from '../core/types';
import { WEAPONS } from '../data/weapons';
import type { World } from './world';
import { addTankChild, removeTankChild } from './tank-display';

/** _-Zx.EffectMeCrazy replaces the previous set of attached effect clips. */
export function decorateStatus(world: World, tank: Tank, kind: DecoratedStatus, duration = 80) {
  if (tank.design.parts.some((part) => part.type === 5005)) return;
  const parts = tank.design.parts;
  removeTankChild(tank, 'status');
  tank.statusDecoration = {
    kind,
    age: 0,
    artAge: 0,
    duration,
    marks: Array.from({ length: Math.min(5, parts.length) }, (_, index) => {
      // At five or more parts the original picks with replacement, even if marks overlap.
      const part = parts.length < 5 ? parts[index] : world.rng.pick(parts);
      return { x: part.x, y: part.y, angle: world.rng.int(-180, 180), frame: world.rng.int(1, 4) };
    }),
  };
  if (tank.statusDecoration.marks.length) addTankChild(tank, 'status');
}

/** Applies the callbacks of _-aw/_-0L/_-Md/_-ar/_-U4, before impact damage. */
export function applyProjectileStatus(world: World, tank: Tank, status: Status, duration = 80) {
  const forcefield = tank.design.parts.some((part) => part.type === 5005);
  if (status === 'infect') {
    if (tank.status.infect > 0) return;
    tank.status.infect = Infinity;
    tank.infectCounter = 0;
    tank.infectStartedAt = tank.artAge;
    tank.infectionAngle = world.rng.int(0, 360);
    addTankChild(tank, 'infection');
    return;
  }
  if (status === 'ink') {
    // InkMe changes avatars only. The callback's separate screen effect also runs on allies.
    if (tank.status.ink === 0) {
      if (tank.design.avatar) tank.status.ink = 121;
      if (!forcefield) world.addCombatEffect({ x: 0, y: 0 }, 'ink');
    }
    return;
  }
  if (tank.shield > 0 || forcefield) return;
  tank.status[status] = duration + 1;
  if (status === 'stun') tank.stunned = true;
  if (status === 'jam')
    for (const gun of tank.guns)
      gun.counter = tank.side === 'player' ? (WEAPONS[gun.part.type]?.rate ?? 0) : 0;
  decorateStatus(world, tank, status, duration);
}

/** Attached effects expire even in the stunned branch. */
export function tickStatusDecoration(tank: Tank) {
  if (tank.statusDecoration && ++tank.statusDecoration.age > tank.statusDecoration.duration) {
    tank.statusDecoration = undefined;
    removeTankChild(tank, 'status');
  }
}

/** Active Run follows parts/maintenance with ink, infection, then weaken expiry. */
export function tickStatusTail(world: World, tank: Tank) {
  if (tank.status.ink > 0) tank.status.ink--;
  if (tank.status.infect > 0 && ++tank.infectCounter === 12) {
    tank.infectCounter = 0;
    world.damage(tank, 1);
  }
  if (tank.status.weaken > 0) tank.status.weaken--;
}

/** Avatar status phase. Enemy/ally Run distributes these phases around their parts. */
export function tickStatus(world: World, tank: Tank) {
  tickStatusDecoration(tank);
  tank.stunned = tank.status.stun > 0;
  if (tank.stunned) {
    tank.status.stun--;
    return;
  }
  for (const kind of ['jam', 'sticky'] as const) if (tank.status[kind] > 0) tank.status[kind]--;
  tickStatusTail(world, tank);
}
