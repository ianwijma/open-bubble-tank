import { projectileOutside } from './projectile-boundary';
import { actorAngle, actorDirection, actorHeading } from './actor-movement';
import { displayPixel } from '../core/display-values';
import type { GunState, Projectile, Tank, Vec } from '../core/types';
import { tankHitDetail } from './hit-location';
import type { World } from './world';
import { createProjectile } from './create-projectile';

interface SapperState {
  movement: Vec;
  home?: Tank;
  master?: Tank;
  maximumLife?: number;
}
const states = new WeakMap<Projectile, SapperState>();
const attachedTanks = (world: World) => [...world.field.enemies, ...world.allies];

/** _-3C retains SpawnNewBullet's object, including an uninitialized rejected birth. */
export function fireSapper(world: World, owner: Tank, gun: GunState) {
  if (gun.sapperRef && world.hasBulletParent(gun.sapperRef)) return;
  const point = world.actorParents.pointAt(owner, world.muzzle(owner, gun), world.currentWrapper);
  if (!point) throw new Error('Sapper trigger has no current field transform');
  const bullet = createProjectile(world.nextId(), {
    owner: -1,
    enemy: false,
    kind: 'sapper',
    symbol: 1831,
    x: 0,
    y: 0,
    angle: 0,
    speed: NaN,
    damage: 1,
    artFrame: 3,
  });
  gun.sapperRef = bullet;
  world.addBullet(bullet, owner, world.player, () => {
    Object.assign(bullet, {
      owner: owner.uid,
      enemy: true,
      x: point.x,
      y: point.y,
      angle: owner.rotation + gun.angle,
      heading: owner.rotation + gun.angle,
      speed: 6,
      damage: 3,
      anchor: gun,
      partType: 4012,
      // Preserve the accepted-shot entropy adapter pending complete constructor verification.
      orbit: world.rng.int(0, 359),
    });
  });
}

function steer(world: World, bullet: Projectile, state: SapperState) {
  const retained = bullet.homing!;
  let destination: Vec | undefined;
  if (!retained.target) {
    state.movement = actorDirection(0, bullet.speed);
    return;
  }
  if (!bullet.returning)
    destination = world.actorParents.localToGlobal(retained.target, tankHitDetail(retained.target));
  else {
    const master = state.master ?? state.home;
    if (
      master &&
      bullet.anchor &&
      master.displayChildren.includes(`part:${bullet.anchor.part.key}`)
    )
      destination = world.actorParents.localToGlobal(master, bullet.anchor.part);
  }
  const origin = world.bulletGlobal(bullet) ?? world.actorParents.fieldGlobal(bullet, world.field);
  let angle = 0;
  if (destination && origin) {
    const delta = { x: destination.x - origin.x, y: destination.y - origin.y };
    if (Math.sqrt(delta.x * delta.x + delta.y * delta.y) < 5) retained.close = true;
    angle = actorHeading(origin, destination);
    bullet.angle = actorAngle(angle);
  }
  // Guarded zero returns initialize horizontal motion without writing rotation.
  state.movement = actorDirection(angle, bullet.speed);
}

/** _-Jp constructor stops on frame3; base Setup immediately steers toward the avatar. */
export function initializeSapper(world: World, bullet: Projectile, home?: Tank, target?: Tank) {
  if (bullet.kind !== 'sapper' || states.has(bullet)) return;
  const state: SapperState = {
    movement: { x: 0, y: 0 },
    home: home ?? attachedTanks(world).find((tank) => tank.uid === bullet.owner),
  };
  states.set(bullet, state);
  bullet.homing = { target: target ?? world.player, avatar: world.player, close: false };
  bullet.returning = false;
  bullet.artFrame = 3;
  steer(world, bullet, state);
}

/** _-Jp: wall, steering, master/shot/target contact, then the pre-contact movement. */
export function tickSapper(world: World, bullet: Projectile) {
  initializeSapper(world, bullet);
  const state = states.get(bullet)!;
  const retained = bullet.homing!;
  if (!world.actorParents.hasParent(retained.avatar)) retained.avatar = world.player;
  const impact = () => world.addCombatEffect(bullet, 'impact');
  if (projectileOutside(world, bullet)) {
    impact();
    bullet.dead = true;
    return;
  }
  steer(world, bullet, state);
  if (!state.master) {
    state.master = state.home;
    state.maximumLife = state.master?.life;
  }
  const master = state.master;
  if (!master || !world.actorParents.inField(master, world.field)) {
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
  const target = retained.target!;
  const origin = world.bulletGlobal(bullet) ?? world.actorParents.fieldGlobal(bullet, world.field)!;
  const center = world.actorParents.localToGlobal(target, { x: 0, y: 0 });
  const hit = (offset: number) =>
    world.hitTest(
      target,
      origin.x + state.movement.x * offset - center.x + target.x,
      origin.y + state.movement.y * offset - center.y + target.y,
    );
  if (retained.close || hit(0) || hit(-0.5)) {
    if (target === master) master.life = Math.min(master.life + 2, state.maximumLife!);
    else {
      impact();
      if (retained.avatar.shield > 0) {
        bullet.dead = true;
        return;
      }
      world.damage(retained.avatar, bullet.damage, bullet);
    }
    bullet.returning = !bullet.returning;
    retained.target = bullet.returning ? master : retained.avatar;
    bullet.targetId = retained.target.uid;
    bullet.artFrame = bullet.returning ? 2 : 3;
    world.projectileTimelines.hold(bullet, bullet.artFrame);
    retained.close = false;
  }
  bullet.x = displayPixel(bullet.x + state.movement.x);
  bullet.y = displayPixel(bullet.y + state.movement.y);
}
