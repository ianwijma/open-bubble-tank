import { FieldVisit } from '../src/game/core/field-visit';
import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';

function frames(world: World, count: number) {
  for (let i = 0; i < count; i++) world.step(emptyInput());
}
function turretWorld() {
  const world = new World([], [], 8);
  const owner = createTank(
    100,
    {
      ...STARTER,
      id: 'turret',
      avatar: false,
      life: 100,
      speed: 0,
      parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 4032 }],
    },
    'enemy',
    200,
    200,
  );
  world.field.enemies = [owner];
  world.field.cleared = false;
  world.fieldVisit = new FieldVisit();
  return { world, owner };
}

test('a complete shield turret stays alive while its gun starts another one', () => {
  const { world, owner } = turretWorld();
  frames(world, 380);
  const first = world.bullets.find((bullet) => bullet.kind === 'turret')!;
  expect(first.build).toBe(4);
  expect(first.artFrame).toBe(4);
  expect(first.stopped).toBe(true);
  expect(Math.hypot(first.x - first.origin!.x, first.y - first.origin!.y)).toBeGreaterThan(192);
  expect(Math.hypot(first.x - first.origin!.x, first.y - first.origin!.y)).toBeLessThan(194);
  frames(world, 20);
  const turrets = world.bullets.filter((bullet) => bullet.kind === 'turret');
  expect(turrets).toHaveLength(2);
  expect(owner.guns[0].turretId).not.toBe(first.uid);
  expect(first.dead).toBe(false);
  expect(owner.shield).toBeGreaterThan(0);
});

test('builders fly straight and are intercepted without consuming the opposing shot', () => {
  const { world } = turretWorld();
  frames(world, 160);
  const turret = world.bullets.find((bullet) => bullet.kind === 'turret')!;
  const builder = world.bullets.find((bullet) => bullet.kind === 'builder')!;
  const heading = builder.angle;
  turret.y -= 60;
  frames(world, 5);
  expect(builder.angle).toBe(heading);
  expect(builder.dead).toBe(false);
  world.fireGun(world.player, world.player.guns[0], emptyInput());
  const shot = world.bullets.at(-1)!;
  shot.x = builder.x;
  shot.y = builder.y;
  frames(world, 1);
  expect(builder.dead).toBe(true);
  expect(shot.dead).toBe(false);
  expect(turret.build).toBe(1);
});
