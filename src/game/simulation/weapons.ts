import { FIELD_RADIUS, STAGE } from '../core/constants';
import { angleTo, direction, distance, length, rotate } from '../core/math';
import { fireDamageBeam } from './beams';
import { triggerMassiveCharge } from '../core/mounted-art';
import { refreshForcefield } from './forcefield';
import { attachMountedShield } from './shields';
import { tickTurretBehavior } from './turrets';
import type {
  GunState,
  InputFrame,
  Projectile,
  Tank,
  TankDesign,
  TankPart,
  Vec,
} from '../core/types';
import { WEAPONS, type WeaponSpec } from '../data/weapons';
import emitterData from '../data/emitters.json';
import allyData from '../data/allies.json';
import type { World } from './world';
import projectileArt from '../data/projectile-art.json';
import { decorateStatus } from './status';
import { advanceRotatingCycle, triggerSuppressionCycle } from './weapon-cycles';
import { projectileFlags } from './projectile-flags';
import { recordLayerMine } from './mine-layers';
import mineArt from '../data/mine-art.json';
import { fireSapper } from './sapper';
import { convertDrones } from './converter';
import { tickBehavior } from './behaviors';
import { weaponAimPoint, finishWeaponAim } from './weapon-targets';
import { actorAngle, actorHeading } from './actor-movement';
import { weaponAimFlags } from '../core/weapon-aim';
import { tickSpike } from './spikes';

export function tickGuns(world: World, t: Tank, input: InputFrame, categories?: readonly number[]) {
  const guns =
    t.side === 'player'
      ? t.guns
      : [...t.guns].sort(
          (a, b) =>
            Number(Math.floor(a.part.type / 1000) === 6) -
            Number(Math.floor(b.part.type / 1000) === 6),
        );
  for (const g of guns) {
    const id = g.part.type,
      category = Math.floor(id / 1000),
      spec = WEAPONS[id];
    if (categories && !categories.includes(category)) continue;
    if (category === 6) {
      tickBehavior(world, t, g);
      continue;
    }
    if (t.side !== 'player' && [4013, 4022].includes(id)) continue;
    if (t.side !== 'player' && id === 4015) {
      if (advanceRotatingCycle(g) && ++g.counter >= spec.rate) {
        g.counter = 0;
        world.fireGun(t, g, input);
      }
      continue;
    }
    if (t.side !== 'player' && id === 4010) {
      // _-Vc.Run calls PartCallRun directly, without target acquisition or Aim.
      if (++g.counter >= spec.rate) {
        world.fireGun(t, g, input);
        g.counter = 0;
      }
      continue;
    }
    if (t.side !== 'player' && id === 4026) {
      tickSpike(world, t, g);
      continue;
    }
    const aim =
      t.side === 'player'
        ? { x: input.aim.x - STAGE.cx + t.x, y: input.aim.y - STAGE.cy + t.y }
        : id === 4032
          ? null
          : weaponAimPoint(world, t, g);
    if (id === 4032) tickTurretBehavior(world, t, g);
    const mount = rotate(g.part, t.rotation),
      pos = { x: t.x + mount.x, y: t.y + mount.y };
    const flags = (g.aim ??= weaponAimFlags(id, t.design.classId));
    if (aim && (t.side === 'player' ? flags.avatar : flags.rotates) && id !== 4032)
      g.angle = actorAngle(actorHeading(pos, aim) - t.rotation);
    const target = t.side === 'player' || id === 4032 ? null : finishWeaponAim(world, t, g);
    if (t.side !== 'player' && id !== 4032 && !target) continue;
    if (t.side !== 'player' && g.burst > 0 && --g.burstTimer <= 0) {
      g.burst--;
      g.burstTimer = 6;
      const index = [0, 4, 3, 2, 1][4 - g.burst];
      world.spawnVolley(t, g, { ...spec, angles: [world.rng.int(-10, 10)] }, index);
    }
    if (id === 5005 && t.side === 'player') {
      refreshForcefield(t);
      continue;
    }
    if (!spec || category === 6) continue;
    if (t.side === 'player') {
      if (g.counter >= 0) g.counter--;
      if ([5003, 5004].includes(id)) {
        tickAutomatic(world, t, g, pos, input);
      } else if (id === 5006 && g.counter === -1) {
        const count = world.bullets.filter(
          (bullet) => !bullet.dead && bullet.anchor === g && bullet.kind === 'orbital',
        ).length;
        if (count < 6) {
          world.fireGun(t, g, input);
          g.counter = spec.rate;
        }
      }
    } else {
      if (id === 4023) {
        if (world.runtimeFor(world.currentWrapper).apocalypse && ++g.counter >= spec.rate) {
          world.fireGun(t, g, input);
          g.counter = 0;
        }
        continue;
      }
      if (id === 4024) {
        if (g.counter < spec.rate) g.counter++;
        else world.fireGun(t, g, input);
        continue;
      }
      if (++g.counter >= spec.rate) {
        g.counter = 0;
        world.fireGun(t, g, input);
      }
    }
  }
}
export function triggerPlayerPrimaries(world: World, tank: Tank, input: InputFrame) {
  for (const gun of tank.guns) {
    if (Math.floor(gun.part.type / 1000) !== 2) continue;
    if (gun.part.type === 2017) {
      if (tank.status.jam > 0) world.stopPrimaryFire();
      else if (input.fire) {
        world.fireGun(tank, gun, input);
        if (gun.counter === -1) gun.counter = WEAPONS[2017].rate;
      }
    } else if (input.fire && gun.counter === -1) {
      world.fireGun(tank, gun, input);
      gun.counter = WEAPONS[gun.part.type]?.rate ?? 0;
    }
  }
}

function tickAutomatic(world: World, tank: Tank, gun: GunState, pos: Vec, input: InputFrame) {
  const flak = gun.part.type === 5004;
  const target = flak
    ? world.bullets.find((bullet) => bullet.uid === gun.autoTargetId && !bullet.dead)
    : world.field.enemies.find((enemy) => enemy.uid === gun.autoTargetId && !enemy.dead);
  if (target) {
    if (flak) gun.angle = angleTo(pos, target) - tank.rotation;
    else {
      const enemy = target as Tank;
      const closest = enemy.design.parts.reduce<TankPart | undefined>(
        (best, part) => (!best || length(part) < length(best) ? part : best),
        undefined,
      );
      const offset = rotate(closest ?? { x: 0, y: 0 }, enemy.rotation);
      const frames = Math.round(
        distance(pos, { x: enemy.x + offset.x, y: enemy.y + offset.y }) / 10,
      );
      const lead = direction(
        enemy.rotation,
        enemy.status.stun > 0
          ? 0
          : enemy.design.speed * (enemy.status.sticky > 0 ? 0.3 : 1) * frames,
      );
      gun.angle =
        angleTo(pos, { x: enemy.x + offset.x + lead.x, y: enemy.y + offset.y + lead.y }) -
        tank.rotation;
    }
  }
  if (gun.counter !== -1) return;
  if (target) {
    world.fireGun(tank, gun, input);
    gun.counter = WEAPONS[gun.part.type].rate;
  }
  // Fire the retained target first, then acquire for the next attempt. Ties choose last.
  const choices = flak
    ? world.bullets.filter((bullet) => !bullet.dead && projectileFlags(bullet).seeker)
    : world.field.enemies.filter((enemy) => !enemy.dead);
  let best = flak ? 100 : Infinity;
  gun.autoTargetId = null;
  for (const choice of choices) {
    const gap = distance(pos, choice);
    if (gap <= best) {
      best = gap;
      gun.autoTargetId = choice.uid;
    }
  }
}

export function fireGun(world: World, t: Tank, gun: GunState, input: InputFrame) {
  const id = gun.part.type,
    spec = WEAPONS[id];
  if (!spec) return;
  if (id === 2017) return fireDamageBeam(world, t, gun);
  if (id === 4017 && !triggerSuppressionCycle(gun)) return;
  if (id === 3010) {
    attachMountedShield(t, gun, () => world.protectionRadius(t) * 2);
    world.scheduleShield(t, gun);
    gun.counter = spec.rate;
    return;
  }
  if (id === 3008) {
    triggerMassiveCharge(gun, t.artAge);
    world.scheduleShot(t, gun, 26);
    gun.counter = spec.rate;
    return;
  }
  if (id === 3011 || id === 3012) {
    if (!t.teleportReady) return;
    t.teleportReady = false;
    const mount = rotate(gun.part, t.rotation);
    // The shipped code calls this.localToGlobal(Point(this.x,this.y)), so the
    // registration offset is transformed twice. Preserve that authored quirk.
    const local = rotate(
      { x: gun.part.x * gun.part.scale, y: gun.part.y * gun.part.scale },
      t.rotation + gun.angle,
    );
    const start = { x: t.x + mount.x + local.x, y: t.y + mount.y + local.y };
    const dest = { x: t.x + input.aim.x - STAGE.cx, y: t.y + input.aim.y - STAGE.cy };
    const limit = FIELD_RADIUS * world.currentWrapper.scale,
      l = length(dest);
    if (l > limit) {
      dest.x *= limit / l;
      dest.y *= limit / l;
    }
    world.addCombatEffect(start, 'teleport');
    world.addCombatEffect(dest, 'teleport');
    world.mainEffects.flash();
    world.adjustBubblefieldObjects({ x: dest.x - start.x, y: dest.y - start.y });
    return;
  }
  if (id === 3002 || id === 3003) {
    const pos = world.muzzle(t, gun);
    world.addCombatEffect(pos, 'areaBurst');
    for (const e of world.field.enemies)
      if (distance(pos, e) <= 145) {
        if (id === 3002) {
          e.status.stun = 101;
          e.stunned = true;
          decorateStatus(world, e, 'stun', 100);
        } else world.damage(e, 25);
      }
    if (id === 3003) {
      for (const bullet of world.bullets.filter(
        (b) => b.enemy && projectileFlags(b).destroyable && distance(b, pos) <= 145,
      ))
        world.removeBullet(bullet);
      world.flushEnemyRemovals();
    }
    return;
  }
  if (id === 3006) {
    world.addCombatEffect(world.muzzle(t, gun), 'conversion');
    convertDrones(world, t);
    return;
  }
  if (id === 3007 || id === 3016) {
    const design: TankDesign = id === 3007 ? allyData.swarm : allyData.mine,
      key = design.id;
    const max = t.guns.filter((g) => g.part.type === id).length;
    const field = world.currentWrapper;
    if (world.runtimeFor(field).allies.filter((a) => a.design.id === key).length >= max) return;
    const global = world.actorParents.fieldGlobal(world.muzzle(t, gun), world.field)!,
      pos = world.actorParents.fieldLocal(global, field)!;
    world.spawnAlly(design, pos);
    return;
  }
  if (id === 4003) {
    const pos = world.actorParents.pointAt(t, world.muzzle(t, gun), world.currentWrapper)!;
    world.spawnEnemy(gun.spawnDesign!, pos);
    return;
  }
  if (id === 4023) {
    const runtime = world.runtimeFor(world.currentWrapper);
    runtime.apocalypse = false;
    const offset = world.activeFields().find(({ field }) => field === world.field)!.offset;
    const mount = rotate(gun.part, t.rotation);
    // RemoveBullet splices the live array, then the source increments its index.
    for (let i = 0; i < runtime.bullets.length; i++)
      if (runtime.bullets[i].kind === 'apocalypse') {
        runtime.bullets[i].dead = true;
        world.removeBullet(runtime.bullets[i], world.currentWrapper);
        world.addCombatEffect(
          { x: t.x + mount.x + offset.x, y: t.y + mount.y + offset.y },
          'neutralize',
          { scale: world.fieldDisplays.readPose(world.currentWrapper).pose.scaleX * 3 },
          true,
        );
      }
    return;
  }
  if (id === 4024) {
    const offset = world.activeFields().find(({ field }) => field === world.field)!.offset;
    for (const e of [...world.runtimeFor(world.currentWrapper).allies, world.player]) {
      const pos = e === world.player ? e : { x: e.x - offset.x, y: e.y - offset.y };
      const gap = Math.max(1, Math.trunc(distance(t, pos) - t.radius - e.radius));
      if (gap < 120) {
        const force = direction(
          angleTo(t, pos),
          (((15 - 2 * e.design.classId) * (120 - gap)) / 120) * (e.side === 'player' ? 1 : 2),
        );
        if (e.side === 'player') {
          e.velocity.x += force.x;
          e.velocity.y += force.y;
        } else e.velocity = force;
        if (gun.counter !== 0) {
          world.addCombatEffect(t, 'ripple', {}, false, world.currentWrapper);
          gun.counter = 0;
        }
      }
    }
    return;
  }
  if (id === 4026) return; // Its trigger is empty; contact belongs to BehaviorRun.
  if (id === 4032) {
    // PartCallTrigger neither aims nor polls the target's frame/parent.
    const builder = gun.turretTarget != null;
    const mount = world.actorParents.localToGlobal(t, gun.part);
    const pos = world.actorParents.fieldLocal(mount, world.currentWrapper);
    if (!pos) throw new Error('Turret trigger has no current field transform');
    const angle = actorAngle(t.rotation + gun.angle);
    const bullet: Projectile = {
      uid: world.nextId(),
      owner: -1,
      enemy: false,
      x: 0,
      y: 0,
      angle: 0,
      heading: 0,
      speed: NaN,
      damage: 1,
      radius: builder ? 2 : 8,
      kind: builder ? 'builder' : 'turret',
      age: 0,
      life: Infinity,
      explode: 0,
      targetId: null,
      hit: new Set(),
      dead: false,
      symbol: builder ? 2440 : 2444,
      artFrame: 1,
      artScale: 1,
      orbit: 0,
      health: builder ? undefined : 0,
      build: builder ? undefined : 1,
      stopped: true,
      motion: { x: 0, y: 0 },
    };
    world.addBullet(bullet, t, undefined, () => {
      // SpawnNewBullet writes pose and runs Setup only inside its birth gate.
      Object.assign(bullet, {
        owner: t.uid,
        enemy: true,
        x: pos.x,
        y: pos.y,
        angle,
        heading: angle,
        speed: 10,
        damage: 0,
        stopped: false,
        motion: direction(angle, 10),
        ...(builder ? {} : { health: 10, origin: { ...pos } }),
      });
    });
    if (!builder) {
      gun.turretTarget = bullet;
      (gun.turretRefs ??= []).push(bullet);
    }
    return;
  }
  if (id === 3015) {
    if (gun.counter !== -1) return;
    world.startRocketTimer(t, gun);
    return;
  }
  if (id === 4020) {
    gun.burst = 5;
    return;
  }
  if (
    [4010, 5006].includes(id) &&
    world.bullets.filter((b) => !b.dead && b.anchor === gun && b.kind === 'orbital').length >= 6
  )
    return;
  if (id === 4012) return fireSapper(world, t, gun);
  const spawned = world.spawnVolley(t, gun, spec);
  if (id === 4009 || id === 4021)
    recordLayerMine(world, gun, spawned[0] ?? null, world.muzzle(t, gun));
}
/** CheckForTeleports swaps slots while traversing, rather than sorting by ID. */
export function orderSecondaries(guns: GunState[]) {
  const ordered = [...guns];
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].part.type === 3011 && i !== 0)
      [ordered[0], ordered[i]] = [ordered[i], ordered[0]];
    if (ordered[i].part.type === 3012 && i !== ordered.length - 1)
      [ordered[ordered.length - 1], ordered[i]] = [ordered[i], ordered[ordered.length - 1]];
  }
  return ordered;
}
export function spawnVolley(
  world: World,
  t: Tank,
  gun: GunState,
  spec: WeaponSpec,
  emitterIndex?: number,
) {
  const spawned: Projectile[] = [];
  if (world.transit) return spawned;
  const count = spec.parallel ?? 1,
    angles = spec.angles ?? [0];
  for (const [angleIndex, offset] of angles.entries())
    for (let i = 0; i < count; i++) {
      const pos = world.muzzle(
        t,
        gun,
        gun.part.type === 3001 || gun.part.type === 3005 ? 0 : 13,
        emitterIndex ?? (count > 1 ? i : angleIndex),
      );
      const angle =
        t.rotation + gun.angle + offset + (gun.part.type === 2015 ? world.rng.int(-15, 15) : 0);
      const points = (emitterData as Record<string, Vec[]>)[gun.part.type];
      const side = direction(
        angle + 90,
        points?.length ? 0 : (i - (count - 1) / 2) * 7 * gun.part.scale,
      );
      const kind = spec.kind ?? 'shell';
      const art = (projectileArt as Record<string, { symbol: number; scale: number }>)[
        gun.part.type
      ];
      const b: Projectile = {
        uid: world.nextId(),
        owner: t.uid,
        enemy: t.side === 'enemy',
        x: pos.x + side.x,
        y: pos.y + side.y,
        angle,
        heading: angle,
        speed: spec.speed,
        damage: spec.damage,
        radius: 2 * (spec.size ?? 1),
        kind,
        age: 0,
        life: Infinity,
        status: spec.status,
        explode: spec.explode ?? 0,
        splashDamage: spec.splashDamage,
        targetId: kind === 'seeker' && t.side === 'enemy' ? world.player.uid : null,
        hit: new Set(),
        dead: false,
        anchor: kind === 'beam' || kind === 'whip' || kind === 'sapper' ? gun : undefined,
        symbol:
          kind === 'mine' && t.side !== 'enemy'
            ? mineArt.ally.symbol
            : (art?.symbol ?? spec.symbol ?? 0),
        partType: gun.part.type,
        artScale: art?.scale ?? 1,
        orbit: world.rng.int(0, 359),
        bounces: 0,
      };
      if (kind === 'rocket') {
        b.heading += world.rng.int(-10, 10);
        b.wobbleFrequency = world.rng.int(10, 20) / 100;
        b.wobbleAmplitude = world.rng.int(1, 8) / 10;
      }
      if (kind === 'orbital') {
        const radius = (gun.part.type === 4010 ? world.displayWidth(t) / 2 : t.radius) + 10;
        const radians = (world.rng.int(0, 360) * Math.PI) / 180;
        b.x = t.x + Math.cos(radians) * radius;
        b.y = t.y + Math.sin(radians) * radius;
        // _-9U/_-Vc pass radians + 90 into the degree-based SpawnNewBullet API.
        b.angle = radians + 90;
        b.targetId = null;
        b.anchor = gun;
        b.life = Infinity;
      }
      if (world.addBullet(b, t, kind === 'seeker' && t.side === 'enemy' ? world.player : undefined))
        spawned.push(b);
    }
  return spawned;
}
