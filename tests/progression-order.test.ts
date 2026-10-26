import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput, nearestExit } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { WEAPONS } from '../src/game/data/weapons';
import { applyProjectileStatus } from '../src/game/simulation/status';

function pickup(world: World, value: number) {
  world.pickups.push({
    uid: world.nextId(),
    x: world.player.x,
    y: world.player.y,
    vx: 0,
    vy: 0,
    value,
    rotation: 0,
    scattering: false,
    collected: false,
    forced: true,
    dead: false,
  });
}
function incoming(world: World, damage: number) {
  const enemy = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, parts: STARTER.parts.filter((p) => p.type < 2000), speed: 0 },
    'enemy',
    200,
    0,
  );
  world.field.enemies = [enemy];
  const gun = {
    part: { ...STARTER.parts[1], type: 4001 },
    counter: 0,
    angle: 0,
    burst: 0,
    burstTimer: 0,
  };
  world.spawnVolley(enemy, gun, { ...WEAPONS[4001], speed: 0, damage });
  const bullet = world.bullets.at(-1)!;
  bullet.x = world.player.x;
  bullet.y = world.player.y;
}

test('a collected bubble fills health in the field phase and opens upgrades on the next interface frame', () => {
  const world = new World([], [], 1);
  world.player.life = 49;
  pickup(world, 1);
  world.step(emptyInput());
  expect(world.player.life).toBe(50);
  expect(world.mode).toBe('playing');
  expect(world.progression.level).toBe(0);
  world.step(emptyInput());
  expect(world.mode).toBe('upgrade');
  expect(world.progression.level).toBe(1);
});

test('higher-level projectile deaths wait for the next interface frame before replacing the tank', () => {
  const world = new World([], [STARTER, { ...STARTER, id: 'higher' }], 1);
  const old = world.player;
  incoming(world, 5);
  world.step(emptyInput());
  expect(world.player).toBe(old);
  expect(old.life).toBeLessThanOrEqual(0);
  expect(world.progression.level).toBe(1);
  world.step(emptyInput());
  expect(world.player).not.toBe(old);
  expect(world.player.design.id).toBe(STARTER.id);
  expect(world.player.life).toBe(49);
  expect(world.progression.level).toBe(0);
});

test('a pickup after a higher-level lethal hit can recover health before the next downgrade check', () => {
  const world = new World([], [STARTER, STARTER], 1);
  const old = world.player;
  world.player.life = 1;
  incoming(world, 2);
  pickup(world, 5);
  world.step(emptyInput());
  expect(world.player.life).toBe(4);
  world.step(emptyInput());
  expect(world.player).toBe(old);
  expect(world.progression.level).toBe(1);
});

test('a level-zero lethal impact starts escape immediately and center/diagonal ties prefer horizontal markers', () => {
  const world = new World([], [], 1);
  world.damage(world.player, 2);
  expect(world.player.life).toBe(1);
  expect(world.mode).toBe('transit');
  expect(world.transit?.direction).toEqual({ x: -1, y: 0 });
  expect(nearestExit({ x: 10, y: 10 })).toEqual({ x: 1, y: 0 });
  expect(nearestExit({ x: -10, y: -10 })).toEqual({ x: -1, y: 0 });
});

test('upgrading during travel restores the same crossing after choosing a design', () => {
  const world = new World([], [], 1);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit;
  world.player.life = 50;
  world.step(emptyInput());
  expect(world.mode).toBe('upgrade');
  world.selectUpgrade(STARTER);
  expect(world.mode).toBe('transit');
  expect(world.transit).toBe(crossing);
  world.step(emptyInput());
  expect(crossing!.age).toBe(1);
});

test('downgrading into a secondary-help dialog during travel restores the crossing on close', () => {
  const shieldTank = {
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'shield', type: 3010 }],
  };
  const world = new World([], [shieldTank, STARTER], 1);
  world.jump({ x: 1, y: 0 });
  const crossing = world.transit;
  world.player.life = 0;
  world.step(emptyInput());
  expect(world.mode).toBe('secondary-help');
  expect(world.player.life).toBe(49);
  world.closeSecondaryHelp();
  expect(world.mode).toBe('transit');
  expect(world.transit).toBe(crossing);
  world.step(emptyInput());
  expect(crossing!.age).toBe(1);
});

test('primary shots run in the same field frame while passive shots wait until the following field frame', () => {
  const primary = new World([], [], 1);
  primary.step({ ...emptyInput(), fire: true });
  expect(primary.bullets[0].age).toBe(1);
  const passive = new World([], [], 1);
  passive.player = createTank(
    passive.nextId(),
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 5006 }] },
    'player',
    0,
    0,
    50,
    2,
  );
  passive.step(emptyInput());
  expect(passive.bullets[0].age).toBe(0);
  passive.step(emptyInput());
  expect(passive.bullets[0].age).toBe(1);
});

test('infection follows the interface check, so higher-level infection deaths replace on the next frame', () => {
  const world = new World([], [STARTER, STARTER], 1);
  const old = world.player;
  old.life = 1;
  old.status.infect = Infinity;
  old.infectCounter = 11;
  world.step(emptyInput());
  expect(old.life).toBe(0);
  expect(world.player).toBe(old);
  world.step(emptyInput());
  expect(world.player).not.toBe(old);
  expect(world.player.life).toBe(49);
});

test('avatar stun suspends part clocks while interface movement and a ready manual trigger still run', () => {
  const world = new World([], [], 1);
  applyProjectileStatus(world, world.player, 'stun', 3);
  for (let i = 0; i < 4; i++) world.step({ ...emptyInput(), right: true, fire: true });
  expect(world.player.x).toBeCloseTo(6);
  expect(world.stats.shots).toBe(1);
  expect(world.player.guns[0].counter).toBe(13);
  expect(world.player.status.stun).toBe(0);
  world.step({ ...emptyInput(), right: true, fire: true });
  expect(world.player.x).toBeCloseTo(9);
  expect(world.player.guns[0].counter).toBe(12);
  expect(world.stats.shots).toBe(1);
});

test('level-zero escape preserves an already visited destination instead of replacing it with deadheads', () => {
  const world = new World([], [], 1),
    home = world.field;
  world.jump({ x: 1, y: 0 });
  for (let i = 0; i < 300 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(world.field.col).toBe(1);
  world.damage(world.player, 2); // The left entry marker is nearest: return to cached home.
  expect(world.mode).toBe('transit');
  expect(world.transit?.next).toBe(home);
  expect(world.fields.get('0,0')).toBe(home);
  expect(home.enemies).toHaveLength(0);
});
