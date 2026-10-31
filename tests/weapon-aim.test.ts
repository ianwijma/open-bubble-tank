import { expect, test } from 'bun:test';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { tickGuns } from '../src/game/simulation/weapons';
import { moveEnemy } from '../src/game/simulation/ai';
import { STARTER } from '../src/game/data/catalog';

const design = (ids: number[], classId = 4) => ({
  ...STARTER,
  classId,
  parts: [
    STARTER.parts[0],
    ...ids.map((type, i) => ({
      ...STARTER.parts[1],
      key: `g${i}`,
      type,
      x: 0,
      y: 0,
      rotation: 25,
    })),
  ],
});
test('heavy manual primaries track the pointer, while secondary setup overrides keep their mount angles', () => {
  const world = new World([], [], 3);
  const tank = createTank(
    world.nextId(),
    design([2001, 3002, 3003, 3004, 3006, 3007, 3008, 3010, 3011, 3012, 3013, 3016, 3017]),
    'player',
  );
  tickGuns(world, tank, { ...emptyInput(), aim: { x: 275, y: 125 } });
  expect(tank.guns[0].angle).toBe(-90);
  expect(tank.guns.slice(1).map((g) => g.angle)).toEqual(Array(12).fill(25));
});
test('Repulsor, Seekers, Whip and Rockets retain the base heavy-class AvatarAim instead of treating every secondary as fixed', () => {
  const world = new World([], [], 3),
    tank = createTank(world.nextId(), design([3005, 3009, 3014, 3015]), 'player');
  tickGuns(world, tank, { ...emptyInput(), aim: { x: 275, y: 125 } });
  expect(tank.guns.map((g) => g.angle)).toEqual([-90, -90, -90, -90]);
});
test('small-class aim remains body-relative and passive automatic/forcefield/orbital mounts do not receive manual aim', () => {
  const world = new World([], [], 3),
    small = createTank(world.nextId(), design([2001, 3009], 3), 'player');
  tickGuns(world, small, { ...emptyInput(), aim: { x: 275, y: 125 } });
  expect(small.guns.map((g) => g.angle)).toEqual([25, 25]);
  const heavy = createTank(world.nextId(), design([5003, 5004, 5005, 5006]), 'player');
  for (const gun of heavy.guns) gun.counter = 10;
  tickGuns(world, heavy, { ...emptyInput(), aim: { x: 275, y: 125 } });
  expect(heavy.guns.map((g) => g.angle)).toEqual([25, 25, 25, 25]);
});
test('a spawner keeps its authored facing while a normal enemy cannon tracks its own target', () => {
  const world = new World([], [], 3),
    tank = createTank(
      world.nextId(),
      { ...design([4003, 4001]), avatar: false },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    );
  world.player.x = 0;
  world.player.y = -100;
  tickGuns(world, tank, emptyInput());
  expect(tank.guns.map((g) => g.angle)).toEqual([25, -90]);
});
test('B1 disables primary rotation only when its first primary has the source rotate flag', () => {
  const world = new World([], [], 3);
  for (const [first, expected] of [
    [4001, false],
    [4002, true],
  ]) {
    const tank = createTank(
      world.nextId(),
      { ...design([first as number, 4001]), id: 'B1-custom', avatar: false },
      'enemy',
    );
    moveEnemy(tank, 1, world.rng, { x: 0, y: -100 });
    expect(tank.guns[1].aim!.rotates).toBe(expected as boolean);
  }
});
test('rotating machine-gun Run ignores target loss and the generic ally-count acquisition path', () => {
  const world = new World([], [], 3),
    tank = createTank(
      world.nextId(),
      { ...design([4015]), avatar: false },
      'enemy',
      0,
      0,
      undefined,
      undefined,
      world,
    ),
    gun = tank.guns[0];
  gun.targeting!.targetId = null;
  gun.counter = 3;
  gun.rotatingCycle = { remaining: 0, active: false };
  tickGuns(world, tank, emptyInput());
  expect(gun.angle).toBe(30);
  expect(world.bullets).toHaveLength(1);
  expect(gun.targeting!.targetId).toBeNull();
});

test('the hidden allied autocannon runs in the primary pass before an earlier-authored behavior mount', () => {
  const world = new World([], [], 3);
  world.rng.next = () => 0.5;
  const enemy = createTank(world.nextId(), { ...design([]), avatar: false }, 'enemy', 100, 0);
  world.field.enemies = [enemy];
  const ally = createTank(
    world.nextId(),
    { ...design([6001, 7001]), avatar: false },
    'ally',
    0,
    0,
    undefined,
    undefined,
    world,
  );
  world.allies = [ally];
  ally.movement.swarmPoint = { x: -999, y: -999 };
  ally.guns[1].counter = 11;
  const firing = world.fireGun.bind(world),
    observed: unknown[] = [];
  world.fireGun = (tank, gun, input) => {
    observed.push(tank.movement.swarmPoint);
    firing(tank, gun, input);
  };
  tickGuns(world, ally, emptyInput());
  expect(observed).toEqual([{ x: -999, y: -999 }]);
  expect(ally.movement.swarmPoint).toEqual({ x: 100, y: 0 });
  expect(world.bullets).toHaveLength(1);
});
