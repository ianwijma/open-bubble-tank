import type { Tank, TankDesign } from '../core/types';
import { tankRadius } from '../data/catalog';
import { createDegradation, degradeTank } from './degradation';
import { tankRosterIdentity } from '../core/tank-identity';
import { initialTankChildren } from './tank-display';
import { Random } from '../core/math';
import type { World } from './world';
import { createPhasing } from './phasing';
import { createActorMovement } from './actor-movement';
import { createWallFlower, setupSkittish } from './behavior-destinations';
import { acquireBehaviorTarget, createBehaviorTarget } from './behavior-targets';
import { acquireHealerTarget } from './healer-target';
export function createTank(
  uid: number,
  design: TankDesign,
  side: Tank['side'],
  x = 0,
  y = 0,
  maxLife = design.life,
  life = maxLife,
  world?: World,
): Tank {
  const cats = side === 'player' ? [2, 3, 5] : side === 'ally' ? [4, 6, 7] : [4, 6];
  const rng = world?.rng ?? new Random(uid || 1),
    registeredBehaviors = new Set<number>();
  const t: Tank = {
    uid,
    design,
    rosterIdentity: tankRosterIdentity(design),
    side,
    x,
    y,
    rotation: 0,
    life,
    maxLife,
    radius: tankRadius(design),
    velocity: { x: 0, y: 0 },
    guns: [],
    status: { stun: 0, jam: 0, sticky: 0, ink: 0, weaken: 0, infect: 0 },
    infectCounter: 0,
    infectStartedAt: 0,
    infectionAngle: 0,
    stunned: false,
    shield: 0,
    shieldAge: 0,
    shieldHitAge: 16,
    shieldHitAngle: 0,
    shieldClips: [],
    teleportReady: true,
    hurtCounter: -1,
    forcefield: 40,
    forcefieldReady: true,
    forcefieldCounter: 0,
    forcefieldFrame: 1,
    forcefieldAngle: 0,
    forcefieldAttached: true,
    forcefieldGeneration: 0,
    forcefieldStartedAt: 0,
    displayChildren: initialTankChildren(design, side),
    age: 0,
    artAge: 0,
    movement: createActorMovement(),
    phase: uid % 50,
    alpha: 1,
    hiddenParts: new Set(),
    removedParts: new Set(),
    degradation: createDegradation(design),
    dead: false,
  };
  t.guns = design.parts.flatMap((part) => {
    const category = Math.floor(part.type / 1000);
    if (!cats.includes(category)) return [];
    // The clip constructor runs before RegisterBehaviorPart rejects duplicate IDs.
    const phasing = part.type === 6004 ? createPhasing(rng) : undefined;
    const wallFlower = part.type === 6005 ? createWallFlower(rng) : undefined;
    if (category === 6) {
      if (registeredBehaviors.has(part.type)) return [];
      registeredBehaviors.add(part.type);
    }
    const state = createBehaviorTarget(),
      behaviorTarget = category === 6 ? state : undefined,
      targeting = category !== 6 ? state : undefined;
    if (side === 'player') state.master = 'player';
    if (part.type === 6003) setupSkittish(t);
    if (world && side !== 'player') {
      const population = {
        avatar: world.player,
        enemies: world.currentWrapper.enemies,
        allies: world.runtimeFor(world.currentWrapper).allies,
      };
      if (part.type === 6002) acquireHealerTarget(state, t, population, rng);
      else acquireBehaviorTarget(state, side, population, rng);
    }
    return [
      {
        part,
        counter: side === 'player' ? -1 : part.type === 4023 ? 240 : 0,
        angle: part.rotation,
        burst: 0,
        burstTimer: 0,
        phasing,
        wallFlower,
        behaviorTarget,
        targeting,
      },
    ];
  });
  return t;
}
export function healTank(t: Tank, value: number) {
  t.life += value | 0;
  if (t.design.avatar && t.life > t.maxLife) t.life = t.maxLife;
  if (t.side === 'enemy') {
    // AddLife restores bodies, then adds missing-health debt without clearing old debt/minimum.
    t.hiddenParts.clear();
    degradeTank(t, t.maxLife - t.life);
  }
}
