import { expect, test } from 'bun:test';
import { STARTER, ENEMIES } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import type { TankDesign } from '../src/game/core/types';

const design = (ids: number[]): TankDesign => ({
  ...STARTER,
  avatar: false,
  parts: [
    STARTER.parts[0],
    ...ids.map((type, index) => ({ ...STARTER.parts[1], type, key: `mount${index}` })),
  ],
});

test('spawner Setup chooses after acquisition and before the following Phasing constructor', () => {
  const world = new World([], [], 11);
  const fighters = ENEMIES.slice(0, 3);
  world.roster.units.set('SmallFighter', fighters);
  const draws = [0.99, 0.33, 0.8, 0.99];
  world.rng.next = () => {
    const value = draws.shift();
    if (value === undefined) throw new Error('Unexpected Setup random draw');
    return value;
  };
  const owner = createTank(world.nextId(), design([4003, 6004]), 'enemy', 0, 0, 100, 100, world);
  expect(owner.guns[0].targeting!.target).toBe(world.player);
  // GetRandomDataByKey uses the inclusive rounded roll, not floor(random * length).
  expect(owner.guns[0].spawnDesign?.id).toBe(fighters[1].id);
  expect(owner.guns[1].phasing!.counter).toBe(40);
  expect(draws).toEqual([]);
});

test('each spawner retains its Setup fighter across roster growth and repeated shots', () => {
  const world = new World([], [], 11);
  const fighters = ENEMIES.slice(0, 3);
  world.roster.units.set('SmallFighter', fighters);
  const draws = [0.99, 0, 0.99, 0.99];
  world.rng.next = () => draws.shift() ?? 0.5;
  const owner = createTank(world.nextId(), design([4003, 4003]), 'enemy', 0, 0, 100, 100, world);
  world.field.enemies = [owner];
  world.actorParents.sync(world);
  world.roster.units.set('SmallFighter', [ENEMIES[3]]);
  world.rng.next = () => {
    throw new Error('Firing must not choose another fighter');
  };
  const spawned: TankDesign[] = [];
  world.spawnEnemy = (fighter) => {
    spawned.push(fighter);
    return owner;
  };
  for (const gun of owner.guns) {
    world.fireGun(owner, gun, emptyInput());
    world.fireGun(owner, gun, emptyInput());
  }
  expect(spawned.map((fighter) => fighter.id)).toEqual([
    fighters[0].id,
    fighters[0].id,
    fighters[2].id,
    fighters[2].id,
  ]);
});
