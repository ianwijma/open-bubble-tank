import { expect, test } from 'bun:test';
import { BOSSES, ENEMIES } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';

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
    if (minimum === 1 && maximum === 1) return 1; // _-De's singleton boss selection.
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

test('a normal scaled field samples fresh poses before the background scale setter', () => {
  // Builtin-only route: no injected roster, local design, RNG result or boss gate.
  const world = new World([], [], 5);
  for (let crossing = 0; crossing < 2; crossing++) {
    world.jump({ x: 1, y: 0 });
    for (let frame = 0; frame < 200 && world.transit; frame++) world.step(emptyInput());
    expect(world.mode).toBe('playing');
    expect(world.transit).toBeNull();
  }
  expect(world.mapPosition).toEqual({ col: 2, row: 0 });
  // Isolate construction from corrected crossing duration and Main's entropy draws.
  // Captured before the third jump on PR152 1f28a46, after 119 travel frames.
  // The exact 33 construction draws and eight source spawn poses remain below.
  world.rng.state = 612916067;
  const draws: number[][] = [];
  const int = world.rng.int.bind(world.rng);
  world.rng.int = (minimum, maximum) => {
    const value = int(minimum, maximum);
    draws.push([minimum, maximum, value]);
    return value;
  };
  world.jump({ x: 1, y: 0 });
  const field = world.transit!.next;
  expect(world.mapPosition).toEqual({ col: 3, row: 0 });
  expect(field.boss).toBe(false);
  expect(world.bossTriggered).toBe(false);
  expect(field.scale).toBe(1.2);
  expect(field.enemies.map((tank) => tank.design.id)).toEqual([
    'E10000034',
    'E10000034',
    'E10000037',
    'E10000018',
    'E10000018',
    'E10000018',
    'E10000018',
    'E10000018',
  ]);
  // _-3y._-Pb(distance3): prepare both options' seven counts, then ticket15.
  // Singleton roster lookups draw nothing. Sticky Again's Weapon.Setup coin
  // occurs immediately before that tank's X/Y/rotation, not before all births.
  expect(draws).toEqual([
    [0, 2, 2],
    [1, 2, 1],
    [2, 5, 4],
    [1, 1, 1],
    [0, 2, -0],
    [1, 2, 2],
    [1, 1, 1],
    [0, 100, 15],
    [-200, 200, 147],
    [-200, 200, -10],
    [-180, 180, 46],
    [-200, 200, 104],
    [-200, 200, 169],
    [-180, 180, -102],
    [1, 2, 1],
    [-200, 200, 139],
    [-200, 200, -160],
    [-180, 180, 14],
    [-200, 200, 52],
    [-200, 200, 15],
    [-180, 180, 126],
    [-200, 200, -94],
    [-200, 200, -2],
    [-180, 180, -58],
    [-200, 200, 147],
    [-200, 200, -131],
    [-180, 180, 146],
    [-200, 200, -21],
    [-200, 200, 172],
    [-180, 180, 94],
    [-200, 200, 71],
    [-200, 200, -103],
    [-180, 180, -7],
  ]);
  expect(field.enemies[2].guns[0].targeting!.target).toBe(world.player);
  // Independent source expectation: each integer X/Y draw times authored
  // BF_BG_mc.scaleX=1, before BTAGameWorld writes 1.2. Rotation is unscaled.
  expect(field.enemies.map((tank) => [tank.x, tank.y, tank.rotation])).toEqual([
    [147, -10, 46],
    [104, 169, -102],
    [139, -160, 14],
    [52, 15, 126],
    [-94, -2, -58],
    [147, -131, 146],
    [-21, 172, 94],
    [71, -103, -7],
  ]);
});

test('reattaching a scaled cached field restores saved poses without new pose draws', () => {
  const world = new World([], [], 5);
  const tank = world.spawnEnemy(ENEMIES[0], { x: 315.25, y: -71.5 });
  tank.rotation = 43.75;
  const enemies = [tank];
  world.cache.store({ ...world.currentWrapper, col: 1, row: 0, scale: 1.6, enemies });
  tank.x = 999;
  tank.y = 999;
  tank.rotation = 999;
  const draws: number[][] = [];
  const int = world.rng.int.bind(world.rng);
  world.rng.int = (minimum, maximum) => {
    draws.push([minimum, maximum]);
    return int(minimum, maximum);
  };
  world.jump({ x: 1, y: 0 });
  const field = world.transit!.next;
  expect(field.scale).toBe(1.6);
  expect(field.enemies).toEqual(enemies);
  expect(field.enemies[0]).toBe(tank);
  expect([tank.x, tank.y, tank.rotation]).toEqual([315.25, -71.5, 43.75]);
  expect(draws).toEqual([]);
});
