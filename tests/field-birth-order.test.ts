import { expect, test } from 'bun:test';
import { BOSSES, ENEMIES } from '../src/game/data/catalog';
import { World } from '../src/game/simulation/world';

test('fresh boss field completes weapon Setup before drawing its display pose', () => {
  const world = new World([], [], 11);
  const fighters = ENEMIES.slice(0, 3);
  world.roster.units.set('SmallFighter', fighters);
  world.progression.level = 5;
  world.player.life = 1000;
  const draws: number[][] = [];
  let position = 0,
    fighter = 0;
  world.rng.int = (minimum, maximum) => {
    draws.push([minimum, maximum]);
    if (minimum === -200 && maximum === 200) return [50, -30][position++];
    if (minimum === -180 && maximum === 180) return 90;
    if (minimum === 0 && maximum === fighters.length - 1) return [0, 2][fighter++];
    if (minimum === 1 && maximum === 2) return 2;
    throw new Error(`Unexpected construction draw ${minimum}..${maximum}`);
  };
  world.jump({ x: 1, y: 0 });
  const field = world.transit!.next;
  expect(field.boss).toBe(true);
  expect(field.enemies).toHaveLength(1);
  const boss = field.enemies[0];
  expect(boss.design).toBe(BOSSES[0]);
  expect(boss.guns.filter((gun) => gun.part.type === 4003).map((gun) => gun.spawnDesign)).toEqual([
    fighters[0],
    fighters[2],
  ]);
  expect([boss.x, boss.y, boss.rotation]).toEqual([50, -30, 90]);
  // _-0D._-Ar calls TankData._-Tr first, then X, Y and rotation in this order.
  // No acquisition or cached-spawner selection can consume entropy after the X draw.
  expect(draws.slice(-3)).toEqual([
    [-200, 200],
    [-200, 200],
    [-180, 180],
  ]);
  expect(draws.slice(0, -3).every(([minimum]) => minimum >= 0)).toBe(true);
});
