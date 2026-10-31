import { FieldVisit } from '../src/game/core/field-visit';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { shieldClipFrame } from '../src/game/core/shield-art';
import { angleTo } from '../src/game/core/math';

function frames(world: World, count: number) {
  for (let i = 0; i < count; i++) world.step(emptyInput());
}
function turretWorld() {
  const world = new World([], [], 8);
  const owner = createTank(
    100,
    {
      ...STARTER,
      id: 'turret',
      avatar: false,
      life: 100,
      speed: 0,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4032 }],
    },
    'enemy',
    200,
    200,
  );
  world.field.enemies = [owner];
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  return { world, owner };
}

test('a complete shield turret stays alive while its gun starts another one', () => {
  const { world, owner } = turretWorld();
  frames(world, 380);
  const first = world.bullets.find((bullet) => bullet.kind === 'turret')!;
  expect(first.build).toBe(4);
  expect(first.artFrame).toBe(4);
  expect(first.stopped).toBe(true);
  expect(Math.hypot(first.x - first.origin!.x, first.y - first.origin!.y)).toBeGreaterThan(192);
  expect(Math.hypot(first.x - first.origin!.x, first.y - first.origin!.y)).toBeLessThan(194);
  frames(world, 20);
  const turrets = world.bullets.filter((bullet) => bullet.kind === 'turret');
  expect(turrets).toHaveLength(2);
  expect(owner.guns[0].turretId).not.toBe(first.uid);
  expect(first.dead).toBe(false);
  expect(owner.shield).toBeGreaterThan(0);
});

test('builders fly straight and are intercepted without consuming the opposing shot', () => {
  const { world } = turretWorld();
  frames(world, 160);
  const turret = world.bullets.find((bullet) => bullet.kind === 'turret')!;
  const builder = world.bullets.find((bullet) => bullet.kind === 'builder')!;
  const heading = builder.angle;
  turret.y -= 60;
  frames(world, 5);
  expect(builder.angle).toBe(heading);
  expect(builder.dead).toBe(false);
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  const shot = world.bullets.at(-1)!;
  shot.x = builder.x;
  shot.y = builder.y;
  frames(world, 1);
  expect(builder.dead).toBe(true);
  expect(shot.dead).toBe(false);
  expect(turret.build).toBe(1);
});

function readyTurret() {
  const { world, owner } = turretWorld();
  const gun = owner.guns[0];
  world.hitTest = () => false;
  world.fireGun(owner, gun, emptyInput());
  const turret = world.bullets[0];
  turret.x = owner.x + 100;
  turret.y = owner.y;
  turret.stopped = true;
  turret.build = 4;
  gun.counter = -1000;
  return { world, owner, gun, turret };
}

test('a builder finishing a turret enables its shield on the next owner Run', () => {
  const { world, owner, gun, turret } = readyTurret();
  turret.build = 3;
  world.fireGun(owner, gun, emptyInput());
  const builder = world.bullets.at(-1)!;
  builder.x = turret.x;
  builder.y = turret.y;
  world.hitProjectile = (shot, x, y) => Math.hypot(x - shot.x, y - shot.y) < 5;
  frames(world, 1);
  expect(turret.build).toBe(4);
  expect(builder.dead).toBe(true);
  expect(owner.shield).toBe(0);
  frames(world, 1);
  expect(owner.shield).toBe(1);
  expect(owner.shieldClips.map(({ kind, style }) => [kind, style])).toEqual([
    ['hit', 'turret'],
    ['film', 'turret'],
  ]);
  expect(gun.turretRefs).toEqual([turret]);
});

test('a turret shield stays latched while jam or stun prevents its owner weapon from polling', () => {
  const { world, owner, turret } = readyTurret();
  frames(world, 1);
  world.removeBullet(turret);
  owner.status.jam = 4;
  frames(world, 3);
  expect(owner.shield).toBe(1);
  expect(owner.shieldClips).toHaveLength(2);
  owner.status.stun = 3;
  frames(world, 3);
  expect(owner.shield).toBe(1);
  expect(owner.status.jam).toBe(1);
  frames(world, 1);
  expect(owner.shield).toBe(0);
  expect(owner.shieldHitClip).toBeUndefined();
  expect(owner.shieldClips.map((clip) => clip.kind)).toEqual(['hit']);
});

test('rebuilding after losing the last turret retains the previous hit and creates a new pair', () => {
  const { world, owner, gun, turret } = readyTurret();
  frames(world, 1);
  const previousHit = owner.shieldHitClip!,
    previousFilm = gun.shieldFilm!;
  const shot = createProjectile(world.nextId(), {
    owner: -1,
    enemy: false,
    kind: 'shell',
    symbol: 1723,
    x: owner.x + 50,
    y: owner.y,
    angle: 0,
    speed: 0,
    damage: 1,
  });
  world.damage(owner, 1, shot);
  frames(world, 4);
  world.removeBullet(turret);
  frames(world, 1);
  expect(owner.shieldHitClip).toBeUndefined();
  expect(owner.displayChildren).toContain(previousHit.key);
  expect(owner.displayChildren).not.toContain(previousFilm.key);
  expect(previousHit.age).toBe(5);
  world.fireGun(owner, gun, emptyInput());
  const next = world.bullets.at(-1)!;
  next.build = 4;
  next.stopped = true;
  frames(world, 1);
  const current = owner.shieldHitClip!;
  expect(current).not.toBe(previousHit);
  expect(owner.shieldClips.map((clip) => clip.kind)).toEqual(['hit', 'hit', 'film']);
  expect(gun.turretRefs).toEqual([next]);
  shot.x = owner.x;
  shot.y = owner.y + 50;
  world.damage(owner, 1, shot);
  expect([current.age, current.angle, previousHit.age, previousHit.angle]).toEqual([0, 90, 6, 0]);
  world.pause();
  frames(world, 100);
  expect(owner.shield).toBe(1);
  expect(owner.shieldClips.map(shieldClipFrame)).toEqual([16, 16, 25]);
});

test('only the last mature turret loss removes the film; launcher aim follows construction targets', () => {
  const { world, owner, gun, turret } = readyTurret();
  frames(world, 1);
  const film = gun.shieldFilm!;
  world.fireGun(owner, gun, emptyInput());
  const second = world.bullets.at(-1)!;
  second.x = owner.x;
  second.y = owner.y + 100;
  second.stopped = true;
  frames(world, 1);
  expect(gun.angle).toBeCloseTo(angleTo(world.muzzle(owner, gun, 0), second) - owner.rotation);
  second.build = 4;
  world.removeBullet(turret);
  frames(world, 1);
  expect(gun.shieldFilm).toBe(film);
  expect(owner.shield).toBe(1);
  expect(gun.turretId).toBeUndefined();
  expect(gun.angle).toBeCloseTo(
    angleTo(world.muzzle(owner, gun, 0), { x: 0, y: 0 }) - owner.rotation,
  );
  world.removeBullet(second);
  frames(world, 1);
  expect(owner.shield).toBe(0);
  expect(gun.turretRefs).toEqual([]);
});

test('the enemy turret launcher passes the source hostile flag even on an allied custom design', () => {
  const { world, owner } = turretWorld();
  const ally = createTank(world.nextId(), owner.design, 'ally', 200, 200);
  world.fireGun(ally, ally.guns[0], emptyInput());
  world.fireGun(ally, ally.guns[0], emptyInput());
  expect(world.bullets.map((bullet) => [bullet.kind, bullet.enemy])).toEqual([
    ['turret', true],
    ['builder', true],
  ]);
});
