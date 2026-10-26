import { expect, test } from 'bun:test';
import { FieldVisit } from '../src/game/core/field-visit';
import { World, emptyInput } from '../src/game/simulation/world';

const arrive = (world: World) => {
  for (let i = 0; i < 200 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(world.mode).toBe('playing');
};

test('the starting wrapper never completes; ordinary empty wrappers complete once', () => {
  const world = new World([], [], 50);
  for (let i = 0; i < 5; i++) world.step(emptyInput());
  expect(world.stats.completed).toBe(0);
  world.fieldVisit = new FieldVisit();
  for (let i = 0; i < 5; i++) world.step(emptyInput());
  expect(world.stats.completed).toBe(1);
});

test('cached cleared fields complete during attachment, with fresh latches and unique map paths', () => {
  const world = new World([], [], 50);
  const home = world.field;
  world.jump({ x: 1, y: 0 });
  const away = world.transit!.next;
  away.enemies = [];
  away.cleared = true;
  world.pause();
  world.step(emptyInput());
  expect(world.stats.completed).toBe(0);
  world.resume();
  world.step(emptyInput());
  expect(world.stats.completed).toBe(1);
  expect(world.field).toBe(home);
  arrive(world);
  world.step(emptyInput());
  expect(world.stats.completed).toBe(1);
  world.jump({ x: -1, y: 0 });
  world.step(emptyInput());
  expect(world.stats.completed).toBe(2);
  expect(world.field).toBe(away);
  arrive(world);
  world.jump({ x: 1, y: 0 });
  world.step(emptyInput());
  expect(world.stats.completed).toBe(3);
  arrive(world);
  expect(world.connections.size).toBe(1);
  expect(world.stats.visited).toBe(1);
});

test('live enemies and destroyed fields do not complete, and cached boss wrappers lose their flag', () => {
  const world = new World([], [], 50);
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.enemies.length).toBeGreaterThan(0);
  world.step(emptyInput());
  expect(world.stats.completed).toBe(0);
  const away = world.transit!.next;
  expect(new FieldVisit().tryComplete({ ...away, enemies: [], destroyed: true })).toBe(false);
  arrive(world);
  world.jump({ x: -1, y: 0 });
  arrive(world);
  away.boss = true;
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next).toBe(away);
  expect(away.boss).toBe(false);
});

test('a destination completion awards the current boss medals but does not open a win screen in transit', () => {
  const world = new World([], [], 50);
  world.jump({ x: 1, y: 0 });
  arrive(world);
  world.field.boss = true;
  world.jump({ x: -1, y: 0 });
  world.step(emptyInput());
  expect(world.achievements.has('Boss Badge')).toBe(true);
  expect(world.mode).toBe('transit');
  expect(world.drainEvents().some((e) => e.type === 'win')).toBe(false);
  arrive(world);
});
