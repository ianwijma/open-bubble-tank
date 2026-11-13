import { importActorFixtures } from './fixtures/actor-attachments';
import { expect, test } from 'bun:test';
import type { Field, TankDesign } from '../src/game/core/types';
import { ENEMIES, STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { tickSapper } from '../src/game/simulation/sapper';
import { World, emptyInput } from '../src/game/simulation/world';
import { defaultProfile, submitCreatedTank } from '../src/game/services/profile';
import { validateBuild } from '../src/game/simulation/designer';
import { rollWave } from '../src/game/simulation/waves';

const still = (design: TankDesign): TankDesign => ({ ...design, speed: 0, reward: 0 });
function caller(): TankDesign {
  const cruiser = ENEMIES.find((tank) => tank.name === 'Cruiser')!;
  return {
    ...cruiser,
    id: 'sapper-caller',
    name: 'Sapper Caller',
    sourceCode: undefined,
    life: 20,
    reward: 5,
    speed: 2,
    parts: [
      ...cruiser.parts.filter((part) => part.type < 2000),
      { ...STARTER.parts[1], key: 'sapper', type: 4012, x: 0, y: 0 },
    ],
  };
}
function setup() {
  const world = new World([], [], 19);
  world.player.life = 40;
  world.hitTest = world.hitProjectile = () => false;
  const design = caller();
  const owner = createTank(world.nextId(), still(design), 'enemy', -100, 0, 100, 100, world);
  for (const gun of owner.guns) gun.counter = Infinity;
  world.field.enemies = [owner];
  importActorFixtures(world);
  world.actorParents.sync(world);
  const gun = owner.guns.find((gun) => gun.part.type === 4012)!;
  world.fireGun(owner, gun, emptyInput());
  return { world, owner, gun, bullet: world.bullets[0] };
}
function preload(world: World, col: number) {
  const sentinel = createTank(world.nextId(), still(STARTER), 'enemy', 150, 0, 100, 100, world);
  const field: Field = {
    col,
    row: 0,
    scale: 1,
    boss: false,
    cleared: false,
    tutorial: 0,
    enemies: [sentinel],
  };
  world.cache.store(field);
}
function arrive(world: World) {
  world.player.x = world.transit!.target.x;
  world.player.y = world.transit!.target.y;
  world.step(emptyInput());
  expect(world.transit).toBeNull();
}

test('saved Sapper caller reaches an ordinary optional-local OpenFighter wave', () => {
  const design = caller();
  expect(ENEMIES.some((tank) => tank.parts.some((part) => part.type === 4012))).toBe(false);
  expect(validateBuild(design, 6, 6)).toEqual([]);
  const saved = submitCreatedTank(defaultProfile(), design).tank!;
  expect(saved.id).toBe('L10000001');
  const world = new World([saved], [], 38);
  world.roster.update(10);
  expect(world.roster.units.get('OpenFighter')!.some((tank) => tank === saved)).toBe(true);
  expect(
    rollWave(10, world.rng, [saved], world.roster).designs.filter((tank) => tank === saved),
  ).toHaveLength(1);
});

test('Sapper mount retains its exact shot, including a queued-dead shot before removal', () => {
  const { world, owner, gun, bullet } = setup();
  expect(gun.sapperRef === bullet).toBe(true);
  bullet.dead = true;
  world.fireGun(owner, gun, emptyInput());
  expect(world.bullets).toEqual([bullet]);
  expect(gun.sapperRef === bullet).toBe(true);
  expect(world.removeBullet(bullet)).toBe(true);
  world.fireGun(owner, gun, emptyInput());
  expect(world.bullets).toHaveLength(1);
  expect(gun.sapperRef).toBe(world.bullets[0]);
  expect(gun.sapperRef).not.toBe(bullet);
});

test('cached Sapper mount keeps its detached-layer shot after a fresh wrapper is attached', () => {
  const { world, owner, gun, bullet } = setup();
  const original = world.field;
  preload(world, 1);
  world.player.x = 425;
  world.jump({ x: 1, y: 0 });
  arrive(world);
  expect(world.hasBulletParent(bullet)).toBe(true);
  world.player.x = -425;
  world.jump({ x: -1, y: 0 });
  arrive(world);
  expect(world.field).not.toBe(original);
  expect(world.field.enemies).toContain(owner);
  world.fireGun(owner, gun, emptyInput());
  expect(gun.sapperRef === bullet).toBe(true);
  expect(world.runtimeFor(original).bullets).toContain(bullet);
  expect(world.bullets).toEqual([]);
  world.removeBullet(bullet, original);
  world.fireGun(owner, gun, emptyInput());
  expect(world.bullets).toHaveLength(1);
  expect(gun.sapperRef).toBe(world.bullets[0]);
});

test('crossing Sapper trigger retains a raw declined birth and retries the next ready trigger', () => {
  const { world, owner, gun, bullet } = setup();
  world.removeBullet(bullet);
  preload(world, 1);
  world.jump({ x: 1, y: 0 });
  const shots = world.stats.enemyShots;
  world.fireGun(owner, gun, emptyInput());
  const declined = gun.sapperRef!;
  expect(declined).toBeDefined();
  expect(declined).not.toBe(bullet);
  expect([declined.x, declined.y, declined.angle, declined.artFrame]).toEqual([0, 0, 0, 3]);
  expect(Number.isNaN(declined.speed)).toBe(true);
  expect(world.hasBulletParent(declined)).toBe(false);
  expect(world.stats.enemyShots).toBe(shots);
  world.fireGun(owner, gun, emptyInput());
  expect(gun.sapperRef).not.toBe(declined);
  expect(world.stats.enemyShots).toBe(shots);
});

test('Sapper steering transforms the projectile and target into the same global space', () => {
  const { world, bullet } = setup();
  bullet.x = 0;
  bullet.y = 20;
  world.player.x = 250;
  world.player.y = 80;
  world.actorParents.sync(world);
  tickSapper(world, bullet);
  expect(bullet.angle).toBeCloseTo((Math.atan2(60, 250) * 180) / Math.PI, 12);
});

test('Sapper master is the captured object, independent of a same-UID array replacement', () => {
  const { world, owner, bullet } = setup();
  const replacement = { ...owner, life: 9 };
  world.actorParents.detach(owner);
  world.field.enemies = [replacement];
  importActorFixtures(world);
  world.actorParents.sync(world);
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(true);
  expect(replacement.life).toBe(9);
});

test('Sapper contains checks physical field membership despite an old array reference', () => {
  const { world, owner, bullet } = setup();
  const other: Field = { ...world.field, enemies: [owner], col: 1 };
  world.actorParents.attach(owner, other);
  expect(world.field.enemies.includes(owner)).toBe(true);
  tickSapper(world, bullet);
  expect(bullet.dead).toBe(true);
});
