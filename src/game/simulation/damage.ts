import type { Projectile, Tank } from '../core/types';
import { angleTo } from '../core/math';
import type { World } from './world';
import { degradeTank } from './degradation';

/** _-Zx.Damage: int argument, weaken, shield, recursive forcefield overflow, then life. */
export function damageTank(world: World, tank: Tank, amount: number, bullet?: Projectile) {
  if (tank.dead) return;
  const damage = ((amount | 0) * (tank.status.weaken > 0 ? 2 : 1)) | 0;
  if (tank.shield > 0) {
    if (bullet) {
      tank.shieldHitAngle = angleTo(tank, bullet) - tank.rotation;
      if (tank.shieldHitAge >= 16) tank.shieldHitAge = 0;
      if (tank.shieldHitClip) {
        tank.shieldHitClip.angle = tank.shieldHitAngle;
        if (tank.shieldHitClip.age >= 16) tank.shieldHitClip.age = 0;
      }
    }
    return;
  }
  if (tank.design.parts.some((part) => part.type === 5005) && tank.forcefieldReady) {
    const overflow = damage - tank.forcefield;
    tank.forcefield -= damage;
    if (tank.forcefield <= 0) {
      tank.forcefieldReady = false;
      tank.forcefield = -15;
      tank.forcefieldFrame = 26;
    }
    // The source calls Damage again, including a second weaken pass on overflow.
    if (overflow > 0) damageTank(world, tank, overflow, bullet);
    if (bullet) {
      tank.forcefieldAngle = angleTo(tank, bullet) - tank.rotation;
      if (tank.forcefieldFrame === 1) tank.forcefieldFrame = 2;
    }
    return;
  }
  tank.life -= damage;
  if (tank.side === 'player') {
    if (tank === world.player && tank.life <= 0 && world.progression.level === 0) {
      world.escapeAtLevelZero();
      return;
    }
    if (tank.life > 0 && tank.hurtCounter === -1) {
      world.emit('hurt');
      tank.hurtCounter = 7;
    }
    // AvatarLifeCorrect is empty and this branch never calls DegradeTank.
    return;
  }
  if (damage > 0) world.emit('hit');
  if (tank.life <= 0) {
    tank.life = 0;
    world.kill(tank);
  } else degradeTank(tank, damage);
}
