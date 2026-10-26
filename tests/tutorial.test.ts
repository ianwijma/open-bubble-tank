import { expect, test } from 'bun:test';
import { TUTORIAL, tutorialDescription, tutorialForAttachment } from '../src/game/core/tutorial';
import { World, emptyInput } from '../src/game/simulation/world';

function finish(world: World) {
  for (let i = 0; i < 150 && world.mode === 'transit'; i++) world.step(emptyInput());
  expect(world.mode).toBe('playing');
}
test('the first destination uses the watermark; later attachments read the pre-increment visit count', () => {
  expect([0, 1, 2, 3, 4, 100].map(tutorialForAttachment)).toEqual([0, 2, 3, 4, 0, 0]);
  const world = new World([], [], 50);
  expect(world.field.tutorial).toBe(1);
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.tutorial).toBe(0);
  expect(world.stats.visited).toBe(1);
  finish(world);
  world.jump({ x: 0, y: 1 });
  expect(world.transit!.next.tutorial).toBe(2);
  finish(world);
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.tutorial).toBe(3);
  finish(world);
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.tutorial).toBe(4);
});
test('revisiting reconstructs the guide without incrementing the unique-field counter', () => {
  const world = new World([], [], 50),
    home = world.field;
  world.jump({ x: 1, y: 0 });
  finish(world);
  world.jump({ x: -1, y: 0 });
  expect(world.transit!.next).toBe(home);
  expect(home.tutorial).toBe(2);
  expect(world.stats.visited).toBe(1);
  finish(world);
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.tutorial).toBe(2);
  expect(world.stats.visited).toBe(1);
});
test('the original guide remains stopped during idle, firing and pause, and retains its hardcoded P text', () => {
  const world = new World([], [], 50);
  for (let i = 0; i < 800; i++) world.step({ ...emptyInput(), fire: true });
  world.pause();
  world.step(emptyInput());
  expect(world.field.tutorial).toBe(1);
  expect(TUTORIAL.stages.map((s) => s.frame)).toEqual([2, 3, 4, 5, 6]);
  expect(tutorialDescription(1)).toContain('left mouse button');
  expect(tutorialDescription(4)).toBe('Press "P" to pause! This brings up a menu full of options.');
});
test('early destroyed holes do not independently advance the tutorial or visit count', () => {
  const world = new World([], [], 50);
  world.fields.set('1,0', { ...world.field, col: 1, destroyed: true });
  world.stats.visited = 1;
  world.jump({ x: 1, y: 0 });
  expect(world.transit!.next.col).toBe(2);
  expect(world.transit!.next.tutorial).toBe(2);
  expect(world.stats.visited).toBe(2);
});
