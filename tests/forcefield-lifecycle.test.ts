import { expect, test } from 'bun:test';
import { FIELD_RADIUS } from '../src/game/core/constants';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { applyProjectileStatus } from '../src/game/simulation/status';
import { detachForcefield, refreshForcefield } from '../src/game/simulation/forcefield';

function setup() {
  const world = new World([], [], 33);
  world.player = createTank(
    world.nextId(),
    { ...STARTER, parts: [...STARTER.parts, { ...STARTER.parts[1], type: 5005, key: 'field' }] },
    'player',
    0,
    0,
    50,
    20,
  );
  world.field.enemies = [];
  world.hitTest = () => false;
  return { world, tank: world.player };
}
function arrive(world: World) {
  const tr = world.transit!;
  world.player.x = tr.target.x;
  world.player.y = tr.target.y;
  world.step(emptyInput());
  expect(world.mode).toBe('playing');
}

test('ordinary boundary cleanup exposes field combat before same-frame passive reconstruction', () => {
  const { world, tank } = setup();
  world.field.enemies = [
    createTank(
      world.nextId(),
      { ...STARTER, avatar: false, speed: 0, parts: [STARTER.parts[0]] },
      'enemy',
      0,
      200,
    ),
  ];
  tank.x = FIELD_RADIUS + 1;
  world.bullets.push(
    createProjectile(world.nextId(), {
      owner: world.field.enemies[0].uid,
      enemy: true,
      kind: 'shell',
      symbol: 1723,
      x: 400,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 7,
    }),
  );
  world.hitTest = (candidate) => candidate === tank;
  world.step(emptyInput());
  expect(tank.life).toBe(13);
  expect(tank.forcefield).toBe(40);
  expect(tank.forcefieldReady).toBe(true);
  expect(tank.forcefieldAttached).toBe(true);
  expect(tank.forcefieldGeneration).toBe(1);
  expect([tank.artAge, tank.forcefieldStartedAt]).toEqual([1, 0]);
});

for (const status of ['jam', 'stun'] as const)
  test(`${status} postpones reconstruction through crossing, pause and arrival`, () => {
    const { world, tank } = setup();
    tank.status[status] = 3;
    tank.forcefield = 21;
    tank.forcefieldCounter = 7;
    tank.x = FIELD_RADIUS + 1;
    world.step(emptyInput());
    expect(world.mode).toBe('transit');
    expect([tank.forcefieldAttached, tank.forcefieldReady, tank.forcefieldGeneration]).toEqual([
      false,
      false,
      0,
    ]);
    const counter = tank.forcefieldCounter;
    world.pause();
    for (let i = 0; i < 5; i++) world.step(emptyInput());
    expect(tank.forcefieldCounter).toBe(counter);
    expect(tank.forcefieldAttached).toBe(false);
    world.resume();
    arrive(world);
    expect(tank.forcefieldAttached).toBe(false);
    tank.status[status] = 0;
    const origin = tank.artAge;
    world.step(emptyInput());
    expect(tank.forcefieldAttached).toBe(true);
    expect(tank.forcefieldReady).toBe(true);
    expect(tank.forcefieldGeneration).toBe(1);
    expect(tank.forcefieldStartedAt).toBe(origin);
    expect(tank.forcefield).toBe(21);
    expect(tank.forcefieldCounter).toBe(counter + 1);
    expect(tank.forcefieldFrame).toBe(1);
  });

test('Setup reactivates a depleted field without erasing damage debt or replenish count', () => {
  const { world, tank } = setup();
  tank.forcefield = -15;
  tank.forcefieldReady = false;
  tank.forcefieldCounter = 12;
  tank.forcefieldFrame = 26;
  tank.forcefieldAngle = 91;
  world.jump({ x: 1, y: 0 });
  arrive(world);
  expect(tank.forcefieldAttached).toBe(false);
  world.step(emptyInput());
  expect([tank.forcefieldReady, tank.forcefield, tank.forcefieldCounter]).toEqual([true, -15, 13]);
  expect([tank.forcefieldFrame, tank.forcefieldAngle]).toEqual([1, 0]);
  world.damage(tank, 1);
  // Original intDamageCount55 overflows to16; Setup does not forgive that debt.
  expect(tank.life).toBe(4);
});

test('replenishment can rearm the detached old clip while stun still prevents Setup', () => {
  const { world, tank } = setup();
  tank.forcefield = 1;
  tank.forcefieldCounter = 19;
  tank.status.stun = 5;
  world.jump({ x: 1, y: 0 });
  arrive(world);
  world.step(emptyInput());
  expect([tank.forcefieldAttached, tank.forcefieldReady, tank.forcefield]).toEqual([
    false,
    true,
    40,
  ]);
  expect(tank.forcefieldGeneration).toBe(0);
  world.damage(tank, 10);
  expect(tank.life).toBe(20);
  expect(tank.forcefield).toBe(30);
});

test('deadhead death escape and Apocalypse direct exits do not call FinalPartCall', () => {
  const death = setup();
  death.tank.forcefieldReady = false;
  death.world.damage(death.tank, 30);
  expect(death.world.mode).toBe('transit');
  expect(death.tank.forcefieldAttached).toBe(true);
  expect(death.tank.forcefieldGeneration).toBe(0);
  const collapse = setup();
  collapse.tank.forcefieldReady = false;
  collapse.tank.forcefield = -15;
  collapse.world.beginCollapse(0);
  for (let i = 0; i < 120; i++) collapse.world.step(emptyInput());
  expect(collapse.world.mode).toBe('transit');
  expect(collapse.tank.forcefieldAttached).toBe(true);
  expect(collapse.tank.forcefieldReady).toBe(false);
  expect(collapse.tank.forcefieldGeneration).toBe(0);
});

test('a trailing mounted part triggers the initial wrapper reorder, preserving depleted debt', () => {
  const { world, tank } = setup();
  tank.design = {
    ...tank.design,
    parts: [...tank.design.parts, { ...STARTER.parts[0], key: 'trailing-body' }],
  };
  world.player = createTank(world.nextId(), tank.design, 'player', 0, 0, 100, 100);
  const avatar = world.player;
  expect(avatar.displayChildren.slice(-3)).toEqual([
    'part:field',
    'forcefield',
    'part:trailing-body',
  ]);
  world.damage(avatar, 40);
  expect([avatar.forcefieldReady, avatar.forcefield]).toEqual([false, -15]);
  world.step(emptyInput());
  expect(avatar.displayChildren.at(-1)).toBe('forcefield');
  expect([avatar.forcefieldReady, avatar.forcefield, avatar.forcefieldCounter]).toEqual([
    true,
    -15,
    1,
  ]);
  expect([avatar.forcefieldGeneration, avatar.forcefieldStartedAt, avatar.forcefieldFrame]).toEqual(
    [0, 0, 27],
  );
  world.damage(avatar, 1);
  // Reordering does not erase the source debt: the recursive overflow is16.
  expect(avatar.life).toBe(84);
});

test('a topmost broken forcefield stays broken until a new attachment causes passive reordering', () => {
  const { world, tank } = setup();
  world.damage(tank, 40);
  world.step(emptyInput());
  expect(tank.forcefieldReady).toBe(false);
  const cloneGeneration = tank.forcefieldGeneration;
  applyProjectileStatus(world, tank, 'infect');
  expect(tank.displayChildren.at(-1)).toBe('infection');
  world.pause();
  world.step(emptyInput());
  expect(tank.forcefieldReady).toBe(false);
  world.resume();
  world.step(emptyInput());
  expect(tank.displayChildren.slice(-2)).toEqual(['infection', 'forcefield']);
  expect(tank.forcefieldReady).toBe(true);
  expect(tank.forcefield).toBe(-15);
  expect(tank.forcefieldGeneration).toBe(cloneGeneration);
  const order = [...tank.displayChildren];
  applyProjectileStatus(world, tank, 'infect');
  expect(tank.displayChildren).toEqual(order);
});

test('a shield pushes its hit and film above the wrapper, then passive Run reuses the wrapper', () => {
  const world = new World([], [], 33);
  const design = {
    ...STARTER,
    parts: [
      STARTER.parts[0],
      { ...STARTER.parts[1], key: 'shield', type: 3010 },
      { ...STARTER.parts[1], key: 'field', type: 5005 },
    ],
  };
  world.player = createTank(world.nextId(), design, 'player', 0, 0, 50, 20);
  world.field.enemies = [];
  const tank = world.player;
  world.damage(tank, 40);
  world.step({ ...emptyInput(), secondary: true });
  expect(tank.shield).toBeGreaterThan(0);
  expect(tank.displayChildren.slice(-3)).toEqual(['shield-hit', 'shield-film', 'forcefield']);
  expect([tank.forcefieldReady, tank.forcefield, tank.forcefieldGeneration]).toEqual([
    true,
    -15,
    0,
  ]);
  for (let i = 0; i < 25; i++) world.step(emptyInput());
  expect(tank.shield).toBe(0);
  expect(tank.displayChildren).not.toContain('shield-film');
  expect(tank.displayChildren).toContain('shield-hit');
  expect(tank.displayChildren.at(-1)).toBe('forcefield');
  detachForcefield(tank);
  expect(tank.displayChildren).not.toContain('forcefield');
  refreshForcefield(tank);
  expect(tank.displayChildren.at(-1)).toBe('forcefield');
  expect(tank.forcefieldGeneration).toBe(1);
});

test('arrival clears shield immunity and its callback but retains the attached film and its clock', () => {
  const { world, tank } = setup();
  tank.design = {
    ...tank.design,
    parts: [...tank.design.parts, { ...STARTER.parts[1], type: 3010, key: 'shield' }],
  };
  world.player = createTank(world.nextId(), tank.design, 'player', 0, 0, 50, 20);
  const avatar = world.player;
  world.fireGun(
    avatar,
    avatar.guns.find((gun) => gun.part.type === 3010)!,
    emptyInput(),
  );
  world.jump({ x: 1, y: 0 });
  arrive(world);
  const age = avatar.shieldAge;
  expect(avatar.shield).toBe(0);
  expect(avatar.displayChildren).toContain('shield-film');
  expect(world.runtimeFor(world.field).pending).toHaveLength(0);
  world.field.enemies = [];
  for (let i = 0; i < 30; i++) world.step(emptyInput());
  expect(avatar.shieldAge).toBe(age + 30);
  expect(avatar.displayChildren).toContain('shield-film');
  avatar.forcefieldReady = false;
  world.damage(avatar, 1);
  expect(avatar.life).toBe(19);
  world.fireGun(
    avatar,
    avatar.guns.find((gun) => gun.part.type === 3010)!,
    emptyInput(),
  );
  expect(avatar.shieldAge).toBe(0);
  expect(avatar.displayChildren.filter((key) => key === 'shield-film')).toHaveLength(1);
  for (let i = 0; i < 25; i++) world.step(emptyInput());
  expect(avatar.displayChildren).not.toContain('shield-film');
});
