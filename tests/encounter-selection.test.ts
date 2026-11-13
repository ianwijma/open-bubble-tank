import { expect, test } from 'bun:test';
import { Random } from '../src/game/core/math';
import { BOSSES, ENEMIES } from '../src/game/data/catalog';
import rules from '../src/game/data/rules.json';
import { UnitRoster, matchesRule } from '../src/game/simulation/waves';
import { World } from '../src/game/simulation/world';

test('offline builtin candidates use the source rounded index instead of a floor pick', () => {
  const pool = ENEMIES.filter((tank) => matchesRule(tank, rules.Balanced));
  expect(pool).toHaveLength(3);
  const rng = new Random(11);
  rng.next = () => 0.33;
  const roster = new UnitRoster(rng);
  // round(.33 * (2 + .8) - .4) = 1; floor(.33 * 3) would choose entry0.
  expect(roster.units.get('Balanced')).toEqual([pool[1]]);
});

test('matching saved candidates retain the offline source choice but use its rounded index', () => {
  const template = ENEMIES.find((tank) => matchesRule(tank, rules.Balanced))!;
  const saved = [0, 1, 2].map((index) => {
    const tank = { ...template, id: `saved-balanced-${index}` };
    delete tank.sourceCode; // Edited mock records must not retain a builtin's encrypted identity.
    return tank;
  });
  const rng = new Random(11);
  // The existing offline 1..2 roll chooses the saved pool; its following 0..2 roll chooses1.
  rng.next = () => 0.33;
  const roster = new UnitRoster(rng, saved);
  expect(roster.units.get('Balanced')).toEqual([saved[1]]);
});

test('the singleton builtin boss consumes its source 1-based selection draw before Setup', () => {
  const world = new World([], [], 11);
  world.progression.level = 5;
  world.player.life = 1000;
  const ranges: number[][] = [];
  let entropy = 0;
  world.rng.next = () => {
    entropy++;
    return 0.5;
  };
  const integer = world.rng.int.bind(world.rng);
  world.rng.int = (minimum, maximum) => {
    ranges.push([minimum, maximum]);
    return integer(minimum, maximum);
  };
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.boss).toBe(true);
  expect(world.transit!.next.enemies[0].design).toBe(BOSSES[0]);
  // PlayerProfile keeps a sentinel at0; _-De samples1..length-1 even for one boss.
  expect(ranges[0]).toEqual([1, BOSSES.length]);
  expect(entropy).toBe(ranges.length);
});
