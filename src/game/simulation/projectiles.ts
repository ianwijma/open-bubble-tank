import { angleTo, deltaAngle, direction, distance, rotate } from '../core/math';
import type { GunState, InputFrame, Projectile, Tank } from '../core/types';
import type { World } from './world';
import { tickHealingBeam } from './healing';
import { tickDamageBeam } from './beams';
import { tickTurret, builderHitsObject } from './turrets';
import { projectileTankContact } from './projectile-contact';
import { projectileFlags } from './projectile-flags';
import { expireInfectionTarget } from './infection-projectile';
import { projectileImpact, rocketTrail } from './effects';
import { tickSeekerMine, tickStaticMine } from './mines';
import { tickStarburst } from './starburst';
import { tickRepulsor } from './repulsor';
import { tickSpinner } from './spinner';
import { tickSapper } from './sapper';
import { tickAvatarSeeker } from './avatar-seeker';
import { tickWhip } from './whip';
import { tickGrow } from './grow';
import { tickFlak } from './flak';
import { projectileOutside, reportProjectileMiss } from './projectile-boundary';
import { deflectFirstEnemy, tickDeflected } from './bubble-buster';
export { starSplit } from './starburst';

export function tickBullet(world: World, b: Projectile, _input: InputFrame) {
  if (b.dead) return;
  if (b.readyForDelete) {
    b.dead = true;
    return;
  }
  b.age++;
  if (--b.life <= 0) {
    b.dead = true;
    return;
  }
  if (b.deflected) {
    tickDeflected(world, b);
    return;
  }
  if (b.kind === 'seekerMine') {
    tickSeekerMine(world, b);
    return;
  }
  if (b.kind === 'mine') {
    tickStaticMine(world, b);
    return;
  }
  if (b.wipe) {
    projectileImpact(world, b);
    b.dead = true;
    return;
  }
  if (b.kind === 'whip') return tickWhip(world, b);
  if (b.kind === 'grow') return tickGrow(world, b);
  if (b.kind === 'flak') return tickFlak(world, b);
  if (b.kind === 'star') return tickStarburst(world, b);
  if (b.kind === 'push') return tickRepulsor(world, b);
  if (b.kind === 'spin') return tickSpinner(world, b);
  if (b.kind === 'sapper') return tickSapper(world, b);
  if (b.kind === 'seeker' && !b.enemy) return tickAvatarSeeker(world, b);
  // Turret tests display containment, so a dead but still attached owner remains valid.
  const owners =
    b.kind === 'turret'
      ? [world.player, ...world.field.enemies, ...world.allies]
      : world.allTanks();
  const owner = owners.find((t) => t.uid === b.owner);
  if (b.kind === 'healBeam') {
    tickHealingBeam(world, b, owner);
    return;
  }
  if (b.kind === 'apocalypse') {
    if (b.detonating) {
      b.artFrame = ++b.detonating + 1;
      if (b.detonating >= 54) {
        world.beginCollapse(b.angle);
        b.dead = true;
      }
      return;
    }
    if (projectileOutside(world, b)) {
      if (
        world.bullets.some(
          (other) => other !== b && !other.dead && other.kind === 'apocalypse' && other.detonating,
        )
      )
        b.dead = true;
      else {
        world.runtimeFor(world.field).apocalypse = true;
        b.detonating = 1;
        b.artFrame = 2;
      }
      return;
    }
    b.artFrame = 1;
  }
  if (
    !['apocalypse', 'beam', 'healBeam', 'turret'].includes(b.kind) &&
    projectileOutside(world, b)
  ) {
    if (b.kind === 'ricochet' && (b.bounces ?? 0) <= 5) {
      b.bounces = (b.bounces ?? 0) + 1;
      b.angle = 2 * angleTo({ x: 0, y: 0 }, b) - b.angle + 180;
    } else {
      world.addCombatEffect(b, 'impact');
      if (b.kind === 'ricochet') reportProjectileMiss(world, b);
      b.dead = true;
      return;
    }
  }
  if (b.kind === 'turret') {
    tickTurret(world, b, owner);
    return;
  }
  if (b.kind === 'builder' && builderHitsObject(world, b)) return;
  const targets = b.enemy ? [world.player, ...world.allies] : world.field.enemies;
  let target = targets.find((t) => t.uid === b.targetId && !t.dead);
  if (!target && b.kind !== 'orbital' && b.kind !== 'infect')
    target = targets.filter((t) => !t.dead).sort((a, c) => distance(a, b) - distance(c, b))[0];
  if (b.kind === 'infect' && !target) expireInfectionTarget(world, b);
  if (b.kind === 'beam') {
    if (!owner || !b.anchor || owner.status.jam > 0) {
      b.dead = true;
      return;
    }
    if (owner.side !== 'player') {
      const pos = world.muzzle(owner, b.anchor);
      b.x = pos.x;
      b.y = pos.y;
      b.angle = owner.rotation + b.anchor.angle;
    }
    tickDamageBeam(world, b, targets);
    return;
  }
  if (['seeker', 'infect'].includes(b.kind) && target) b.angle = angleTo(b, target);
  if (b.kind === 'orbital') {
    if (!owner) {
      b.dead = true;
      return;
    }
    if (target) b.angle = angleTo(b, target);
    else {
      if (distance(b, owner) > owner.radius + 20) {
        const delta = deltaAngle(b.angle, angleTo(b, owner));
        if (Math.abs(delta) >= 15) b.angle += delta / 20;
      } else {
        b.angle += 5;
        const off = direction(b.angle - 90, owner.radius + 10);
        b.x = owner.x + off.x;
        b.y = owner.y + off.y;
      }
      b.targetId = targets.find((t) => !t.dead && distance(t, b) - t.radius < 100)?.uid ?? null;
    }
  }
  if ((b.kind === 'seeker' && b.enemy) || b.kind === 'orbital') {
    for (const shot of world.bullets)
      if (
        !shot.dead &&
        shot.enemy !== b.enemy &&
        [0, -0.5, 0.5].some((offset) => {
          const delta = direction(b.angle, b.speed * offset);
          return world.hitProjectile(shot, b.x + delta.x, b.y + delta.y);
        })
      ) {
        b.dead = true;
        projectileImpact(world, b);
        return;
      }
  }
  if (b.kind === 'buster') {
    deflectFirstEnemy(world, b);
  }
  if (b.kind !== 'buster') {
    const hit = projectileTankContact(world, b);
    if (hit && b.kind === 'infect') b.removeAfterFrame = true;
    if (hit && !['pierce', 'apocalypse', 'infect'].includes(b.kind)) {
      b.dead = true;
      return;
    }
  }
  if (b.kind === 'rocket') {
    b.angle =
      b.heading +
      (Math.sin((45 + b.age) * (b.wobbleFrequency ?? 0.15)) * (b.wobbleAmplitude ?? 0.4) * 180) /
        Math.PI;
  }
  const velocity = direction(b.angle, b.speed);
  b.x += velocity.x;
  b.y += velocity.y;
  if (b.kind === 'rocket' && !b.dead) rocketTrail(world, b);
}
export function releaseCarrier(world: World, t: Tank, gun: GunState) {
  for (const [x, y] of [
    [-22, 0],
    [22, 0],
    [0, -22],
    [0, 22],
    [-9, 0],
    [9, 0],
  ]) {
    world.spawnVolley(t, gun, { rate: 0, speed: 5, damage: 2, kind: 'seeker' });
    const delta = rotate({ x, y }, t.rotation + gun.angle),
      b = world.bullets[world.bullets.length - 1];
    if (!world.transit && b) {
      b.x += delta.x;
      b.y += delta.y;
    }
  }
  t.removedParts.add(gun.part.key);
  t.guns = t.guns.filter((g) => g !== gun);
  if (t.design.parts.every((p) => p.type === 4013) && !t.guns.some((g) => g.part.type === 4013))
    world.kill(t);
}
export function explode(
  world: World,
  b: Projectile,
  radius: number,
  damage: number,
  directTarget?: Tank | Projectile,
) {
  const inRange = (pos: { x: number; y: number }, center: { x: number; y: number }) =>
    distance(pos, center) < radius * 1.15;
  if (b.enemy) {
    if (distance(world.player, b) - world.player.radius <= radius)
      world.damage(world.player, damage);
    for (const tank of world.allies)
      if (tank !== directTarget && !tank.dead && inRange(tank, b)) world.damage(tank, damage);
  } else {
    for (const tank of world.field.enemies)
      if (tank !== directTarget && !tank.dead && inRange(tank, b)) world.damage(tank, damage);
  }
  // Enemy area cleanup uses param2 (the contact), unlike tank damage centered on param3.
  const center = b.enemy ? directTarget : b;
  if (center)
    for (let index = 0; index < world.bullets.length; index++) {
      const shot = world.bullets[index];
      if (shot.enemy !== b.enemy && projectileFlags(shot).destroyable && inRange(shot, center)) {
        shot.dead = true;
        world.removeBullet(shot);
        index--;
      }
    }
  world.flushEnemyRemovals();
}
