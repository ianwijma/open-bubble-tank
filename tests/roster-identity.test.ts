import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import type { TankDesign, TankPart } from '../src/game/core/types';
import { Random } from '../src/game/core/math';
import { tankRosterIdentity } from '../src/game/core/tank-identity';
import { AVATARS, BOSSES, ENEMIES, STARTER } from '../src/game/data/catalog';
import { decodeTankCode } from '../src/game/services/tank-code';
import { createTank } from '../src/game/simulation/tank';
import { UnitRoster } from '../src/game/simulation/waves';

function mockDesign(): TankDesign {
  const design = { ...STARTER, parts: STARTER.parts.map((part) => ({ ...part })) };
  delete design.sourceCode;
  return design;
}
function emptyRoster() {
  const roster = new UnitRoster(new Random(11));
  roster.units.clear();
  return roster;
}

const source = '../documented-bubble-tank-3/re/bt3/builtin_tanks.json';
test.skipIf(!existsSync(source))(
  'all imported builtin designs retain their exact original encrypted DATA identity',
  () => {
    const recovered = JSON.parse(readFileSync(source, 'utf8')) as Record<
      string,
      { code: string }[]
    >;
    const builtin = [AVATARS, ENEMIES, BOSSES].flat();
    const original = Object.values(recovered).flat();
    expect(builtin).toHaveLength(75);
    expect(original).toHaveLength(builtin.length);
    for (let index = 0; index < builtin.length; index++) {
      // Compare booleans so a failed assertion cannot dump encrypted strings.
      expect(builtin[index].sourceCode === original[index].code).toBe(true);
      expect(tankRosterIdentity(builtin[index]) === original[index].code).toBe(true);
    }
  },
);

test('decoding an original tank code preserves the supplied trimmed identity', async () => {
  const original = STARTER.sourceCode!;
  const decoded = await decodeTankCode(`\n ${original} \n`);
  expect(decoded.sourceCode === original).toBe(true);
  expect(tankRosterIdentity(decoded) === tankRosterIdentity(STARTER)).toBe(true);
});

test('canonical mock identity includes every design field rather than only ID or weapon points', () => {
  const design = mockDesign();
  const identity = tankRosterIdentity(design);
  const changes: Partial<TankDesign>[] = [
    { id: `${design.id}-different` },
    { name: `${design.name}-different` },
    { author: `${design.author}-different` },
    { avatar: !design.avatar },
    { classId: 2 },
    { life: design.life + 1 },
    { reward: design.reward + 1 },
    { speed: design.speed + 0.1 },
    { difficulty: design.difficulty + 1 },
  ];
  for (const change of changes)
    expect(tankRosterIdentity({ ...design, ...change }) !== identity).toBe(true);
});

test('canonical mock identity includes every part field and preserves authored part order', () => {
  const design = mockDesign();
  const identity = tankRosterIdentity(design);
  const first = design.parts[0];
  const changes: Partial<TankPart>[] = [
    { key: `${first.key}-different` },
    { type: first.type + 1 },
    { twin: `${first.twin}-different` },
    { x: first.x + 1 },
    { y: first.y + 1 },
    { rotation: first.rotation + 1 },
    { scale: first.scale + 0.1 },
    { radius: first.radius + 1 },
  ];
  for (const change of changes)
    expect(
      tankRosterIdentity({
        ...design,
        parts: [{ ...first, ...change }, ...design.parts.slice(1)],
      }) !== identity,
    ).toBe(true);
  expect(tankRosterIdentity({ ...design, parts: [...design.parts].reverse() }) !== identity).toBe(
    true,
  );
});

test('canonical mock identity ignores JavaScript property insertion order', () => {
  const design = mockDesign();
  const reordered = Object.fromEntries(Object.entries(design).reverse()) as unknown as TankDesign;
  reordered.parts = design.parts.map(
    (part) => Object.fromEntries(Object.entries(part).reverse()) as unknown as TankPart,
  );
  expect(tankRosterIdentity(design) === tankRosterIdentity(reordered)).toBe(true);
});

test('roster lookup distinguishes duplicate IDs with different design contents', () => {
  const roster = emptyRoster();
  const first = mockDesign(),
    second = { ...first, life: first.life + 20 };
  roster.units.set('TinyDeadHead', [first]);
  roster.units.set('HeavyMiniBoss', [second]);
  expect(roster.lookupKey(tankRosterIdentity(first))).toBe('TinyDeadHead');
  expect(roster.lookupKey(tankRosterIdentity(second))).toBe('HeavyMiniBoss');
  expect(roster.lookupKey(tankRosterIdentity({ ...first, name: 'not loaded' }))).toBe('');
});

test('roster lookup distinguishes identical decoded content supplied under different source codes', () => {
  const roster = emptyRoster();
  const first = { ...mockDesign(), sourceCode: 'original-data-one' },
    second = { ...first, sourceCode: 'original-data-two' };
  roster.units.set('Fighter', [first]);
  roster.units.set('HeavyMiniBoss', [second]);
  expect(roster.lookupKey(tankRosterIdentity(first))).toBe('Fighter');
  expect(roster.lookupKey(tankRosterIdentity(second))).toBe('HeavyMiniBoss');
  expect(tankRosterIdentity(first) === tankRosterIdentity(second)).toBe(false);
});

test('roster lookup returns the first exact match in lexicographic KEY order', () => {
  const roster = emptyRoster(),
    tank = mockDesign();
  roster.units.set('TinyDeadHead', [tank]);
  roster.units.set('HeavyMiniBoss', [{ ...tank }]);
  roster.units.set('Balanced', [{ ...tank }]);
  expect(roster.lookupKey(tankRosterIdentity(tank))).toBe('Balanced');
});

test('a tank caches birth roster identity despite later health, body and design metadata changes', () => {
  const design = mockDesign(),
    roster = emptyRoster();
  roster.units.set('HeavyMiniBoss', [
    { ...design, parts: design.parts.map((part) => ({ ...part })) },
  ]);
  const tank = createTank(1, design, 'enemy');
  const identity = tank.rosterIdentity;
  tank.life = 1;
  tank.design.reward = 0;
  tank.design.parts.splice(0, 1);
  tank.hiddenParts.add('hidden-body');
  tank.design.name = 'mutated live tank';
  expect(tank.rosterIdentity === identity).toBe(true);
  expect(tankRosterIdentity(tank.design) === identity).toBe(false);
  expect(roster.lookupKey(tank.rosterIdentity)).toBe('HeavyMiniBoss');
});

test('a tank retains its imported birth DATA even when live source metadata is replaced', () => {
  const design = { ...mockDesign(), sourceCode: 'birth-data' },
    tank = createTank(1, design, 'enemy');
  design.sourceCode = 'replacement-data';
  expect(tank.rosterIdentity).toBe('birth-data');
  expect(tankRosterIdentity(tank.design)).toBe('replacement-data');
});
