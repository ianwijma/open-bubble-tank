import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World } from '../src/game/simulation/world';
import { cacheEmptyField } from './fixtures/empty-field';

function carrier(release = true) {
  const world = new World([], [], 42);
  world.player.x = 200;
  world.player.y = 0;
  const owner = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      parts: [
        STARTER.parts[0],
        { ...STARTER.parts[1], type: 4013, key: 'carrier', x: 20, y: 10, rotation: 30, scale: 1 },
      ],
    },
    'enemy',
    100,
    50,
  );
  owner.rotation = 90;
  world.field.enemies = [owner];
  world.actorParents.sync(world);
  const gun = owner.guns[0];
  if (release) world.releaseCarrier(owner, gun);
  return { world, owner, gun };
}

test('carrier offsets stay on field axes after its emitter Point conversion', () => {
  const { world, owner } = carrier();
  expect(world.bullets.map((b) => [b.x, b.y])).toEqual([
    [68, 70],
    [112, 70],
    [90, 48],
    [90, 92],
    [81, 70],
    [99, 70],
  ]);
  expect(owner.removedParts.has('carrier')).toBe(true);
  expect(owner.guns).toEqual([]);
});

test('carrier births use original enemy-seeker artwork', () => {
  const { world } = carrier();
  expect(world.bullets.map((b) => b.symbol)).toEqual([1809, 1809, 1809, 1809, 1809, 1809]);
});

test('each carrier seeker steers during Setup from its own final birth point', () => {
  const { world } = carrier();
  const positions = [
    [68, 70],
    [112, 70],
    [90, 48],
    [90, 92],
    [81, 70],
    [99, 70],
  ];
  expect(world.bullets.map((b) => b.angle)).toEqual(
    positions.map(([x, y]) => (360 * Math.atan2(-y, 200 - x)) / (2 * Math.PI)),
  );
});

test('a crossing carrier still attempts six births without attaching or counting declined shots', () => {
  const { world, owner, gun } = carrier(false);
  cacheEmptyField(world, 1, 0);
  world.jump({ x: 1, y: 0 });
  const shots = world.stats.enemyShots,
    add = world.addBullet.bind(world);
  let attempts = 0;
  world.addBullet = (bullet, home, target) => {
    attempts++;
    expect(add(bullet, home, target)).toBe(false);
    expect(world.hasBulletParent(bullet)).toBe(false);
    return false;
  };
  world.releaseCarrier(owner, gun);
  expect(attempts).toBe(6);
  expect(world.bullets).toEqual([]);
  expect(world.stats.enemyShots).toBe(shots);
  expect(owner.removedParts.has('carrier')).toBe(true);
  expect(owner.guns).toEqual([]);
});
