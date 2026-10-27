import type { Tank, TankDesign } from '../core/types';
import { tankRadius } from '../data/catalog';
import { createDegradation, degradeTank } from './degradation';
import { tankRosterIdentity } from '../core/tank-identity';
export function createTank(
  uid: number,
  design: TankDesign,
  side: Tank['side'],
  x = 0,
  y = 0,
  maxLife = design.life,
  life = maxLife,
): Tank {
  const cats = side === 'player' ? [2, 3, 5] : [4, 6, 7];
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
    guns: design.parts
      .filter((p) => cats.includes(Math.floor(p.type / 1000)))
      .map((part) => ({
        part,
        counter: side === 'player' ? -1 : part.type === 4023 ? 240 : 0,
        angle: part.rotation,
        burst: 0,
        burstTimer: 0,
      })),
    status: { stun: 0, jam: 0, sticky: 0, ink: 0, weaken: 0, infect: 0 },
    infectCounter: 0,
    infectStartedAt: 0,
    infectionAngle: 0,
    stunned: false,
    shield: 0,
    shieldAge: 0,
    shieldHitAge: 16,
    shieldHitAngle: 0,
    teleportReady: true,
    hurtCounter: -1,
    forcefield: 40,
    forcefieldReady: true,
    forcefieldCounter: 0,
    forcefieldFrame: 1,
    forcefieldAngle: 0,
    age: 0,
    artAge: 0,
    turnFrames: 0,
    turnRate: 0,
    holdTurn: 0,
    phase: uid % 50,
    alpha: 1,
    targetId: null,
    hiddenParts: new Set(),
    removedParts: new Set(),
    degradation: createDegradation(design),
    dead: false,
  };
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
