import { expect, test } from 'bun:test';
import { Random } from '../src/game/core/math';
import { ENEMIES } from '../src/game/data/catalog';
import rules from '../src/game/data/rules.json';
import { matchesRule, rollWave, UnitRoster } from '../src/game/simulation/waves';

const tiny = ENEMIES.find((tank) => matchesRule(tank, rules.TinyDeadHead))!;
const small = ENEMIES.find((tank) => matchesRule(tank, rules.SmallDeadHead))!;

function table() {
  const roster = new UnitRoster(new Random(11));
  roster.units.clear();
  return roster;
}

test('all available count draws precede the rounded wave ticket and singleton lookups draw nothing', () => {
  const roster = table();
  roster.units.set('TinyDeadHead', [tiny]);
  roster.units.set('SmallDeadHead', [small]);
  const rng = new Random(11);
  let draws = 0;
  rng.next = () => {
    draws++;
    return 0.499;
  };
  const wave = rollWave(1, rng, [], roster);
  // Source prepares five instructions, then ticket50 chooses the second50-chance option.
  expect(wave.designs.map((tank) => tank.name)).toEqual([
    tiny.name,
    small.name,
    small.name,
    small.name,
    small.name,
  ]);
  expect(draws).toBe(6);
});

test('repeated KEY selection rejects the previous index while retaining every retry draw', () => {
  const roster = table();
  const variants = [small, { ...small, name: 'second' }, { ...small, name: 'third' }];
  roster.units.set('TinyDeadHead', [tiny]);
  roster.units.set('SmallDeadHead', variants);
  const values = [0, 0, 0, 0, 0, 0.499, 0, 0, 0, 0.99];
  const rng = new Random(11);
  rng.next = () => {
    const value = values.shift();
    if (value === undefined) throw new Error('Unexpected wave random draw');
    return value;
  };
  const wave = rollWave(1, rng, [], roster);
  expect(wave.designs.map((tank) => tank.name)).toEqual([tiny.name, small.name, 'third']);
  expect(values).toEqual([]);
});

test('changing KEY resets repeat avoidance even if its selected entry has the same ID', () => {
  const roster = table();
  const firstTiny = { ...tiny, id: 'shared-id', name: 'tiny-first' };
  const firstSmall = { ...small, id: 'shared-id', name: 'small-first' };
  roster.units.set('TinyDeadHead', [firstTiny, { ...tiny, name: 'tiny-second' }]);
  roster.units.set('SmallDeadHead', [firstSmall, { ...small, name: 'small-second' }]);
  const values = [0, 0, 0, 0, 0, 0.499, 0, 0, 0.99];
  const rng = new Random(11);
  rng.next = () => {
    const value = values.shift();
    if (value === undefined) throw new Error('Unexpected wave random draw');
    return value;
  };
  const wave = rollWave(1, rng, [], roster);
  expect(wave.designs.map((tank) => tank.name)).toEqual([
    'tiny-first',
    'small-first',
    'small-second',
  ]);
  expect(values).toEqual([]);
});
