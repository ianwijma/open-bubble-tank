import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';

function setup() {
  const world = new World([], [], 76);
  world.player = createTank(
    world.nextId(),
    {
      ...STARTER,
      parts: [
        STARTER.parts[0],
        ...['a', 'b'].map((key) => ({ ...STARTER.parts[1], key, type: 3010 })),
      ],
    },
    'player',
    0,
    0,
    50,
    20,
  );
  world.field.enemies = [];
  world.hitTest = () => false;
  const tank = world.player;
  return { world, tank, a: tank.guns[0], b: tank.guns[1] };
}
function tick(world: World, frames: number) {
  for (let i = 0; i < frames; i++) world.step(emptyInput());
}

test('staggered shield mounts keep separate films and callbacks but share immunity', () => {
  const { world, tank, a, b } = setup();
  world.protectionRadius = () => 40;
  world.fireGun(tank, a, emptyInput());
  tick(world, 10);
  world.protectionRadius = () => 60;
  world.fireGun(tank, b, emptyInput());
  expect(tank.displayChildren.slice(-4)).toEqual([
    'shield-hit:a',
    'shield-film:a:1',
    'shield-hit:b',
    'shield-film:b:1',
  ]);
  expect(tank.shieldClips.map(({ kind, age, diameter }) => [kind, age, diameter])).toEqual([
    ['hit', 16, 80],
    ['film', 10, 80],
    ['hit', 16, 120],
    ['film', 0, 120],
  ]);
  expect(world.runtimeFor(world.field).pending).toHaveLength(2);
  tick(world, 15);
  expect(a.shieldFilm).toBeUndefined();
  expect(b.shieldFilm?.age).toBe(15);
  expect(tank.displayChildren).toContain('shield-film:b:1');
  expect(tank.shield).toBe(0);
  const life = tank.life;
  world.damage(tank, 1);
  expect(tank.life).toBe(life - 1);
  tick(world, 10);
  expect(tank.shieldClips.map((clip) => clip.key)).toEqual(['shield-hit:a', 'shield-hit:b']);
  expect(world.runtimeFor(world.field).pending).toHaveLength(0);
});

test('the latest hit pointer stays on the last first-used mount through retriggers', () => {
  const { world, tank, a, b } = setup();
  world.fireGun(tank, a, emptyInput());
  const older = tank.shieldHitClip!;
  world.fireGun(tank, b, emptyInput());
  const newest = tank.shieldHitClip!;
  const shot = createProjectile(world.nextId(), {
    owner: -1,
    enemy: true,
    kind: 'shell',
    symbol: 1723,
    x: 0,
    y: 50,
    angle: 0,
    speed: 0,
    damage: 1,
  });
  world.damage(tank, 1, shot);
  expect([older.age, older.angle, newest.age, newest.angle]).toEqual([16, 0, 0, 90]);
  tick(world, 4);
  shot.x = -50;
  shot.y = 0;
  world.damage(tank, 1, shot);
  expect([newest.age, newest.angle]).toEqual([4, 180]);
  world.fireGun(tank, a, emptyInput());
  expect(tank.shieldHitClip).toBe(newest);
  expect(tank.shieldClips.filter((clip) => clip.kind === 'hit')).toHaveLength(2);
});

test('an earlier queued callback removes the same mount’s newer film', () => {
  const { world, tank, a } = setup();
  world.fireGun(tank, a, emptyInput());
  const first = a.shieldFilm!;
  tick(world, 10);
  // Direct trigger exercises source callback identity before the normal60-frame rate permits it.
  world.fireGun(tank, a, emptyInput());
  const newer = a.shieldFilm!;
  expect(newer).not.toBe(first);
  expect(tank.displayChildren).not.toContain(first.key);
  expect(world.runtimeFor(world.field).pending).toHaveLength(2);
  tick(world, 15);
  expect(tank.displayChildren).not.toContain(newer.key);
  expect(a.shieldFilm).toBeUndefined();
  expect(tank.shield).toBe(0);
  expect(world.runtimeFor(world.field).pending).toHaveLength(1);
});

test('arrival keeps all mounted films and their independent stage clocks without callbacks or immunity', () => {
  const { world, tank, a, b } = setup();
  world.fireGun(tank, a, emptyInput());
  tick(world, 10);
  world.fireGun(tank, b, emptyInput());
  world.jump({ x: 1, y: 0 });
  tank.x = world.transit!.target.x;
  tank.y = world.transit!.target.y;
  tick(world, 1);
  expect(tank.shield).toBe(0);
  expect(world.runtimeFor(world.field).pending).toHaveLength(0);
  const ages = [a.shieldFilm!.age, b.shieldFilm!.age];
  world.pause();
  tick(world, 30);
  expect([a.shieldFilm!.age, b.shieldFilm!.age]).toEqual(ages.map((age) => age + 30));
  world.fireGun(tank, a, emptyInput());
  expect(a.shieldFilm!.age).toBe(0);
  expect(b.shieldFilm!.age).toBe(ages[1] + 30);
});
