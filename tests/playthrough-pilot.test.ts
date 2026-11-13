import { expect, test } from 'bun:test';
import { AVATARS, STARTER } from '../src/game/data/catalog';
import { World } from '../src/game/simulation/world';
import { spawnPickups } from '../src/game/simulation/pickups';
import { PlaythroughPilot } from '../tools/playthrough/pilot';
import { setFieldFixtureLayout } from './fixtures/field-layout';

function collecting() {
  const history = [
    STARTER,
    ...['A10000036', 'A10000040'].map((id) => AVATARS.find((t) => t.id === id)!),
  ];
  const world = new World([], history, 17),
    pilot = new PlaythroughPilot();
  // Observed native pre-crossing state at frame13450. The reward location is an
  // explicit controlled fixture, not a recovered position from that trace.
  world.player.x = -118.5;
  world.player.y = 326.55;
  world.player.velocity = { x: 0, y: 4.380000000000003 };
  world.player.life = 169;
  setFieldFixtureLayout(world);
  spawnPickups(world, { x: -118.5, y: -350 }, 1, world.pickups, true);
  return { world, pilot };
}

test('pilot steers inward instead of coasting while a cleared field delivers rewards', () => {
  const { world, pilot } = collecting(),
    input = pilot.input(world);
  expect(world.field.cleared).toBe(true);
  expect(world.pickups).toHaveLength(1);
  expect({ up: input.up, down: input.down, right: input.right, left: input.left }).toEqual({
    up: true,
    down: false,
    right: true,
    left: false,
  });
  expect(input.fire).toBe(false);
  expect(input.secondary).toBe(false);
});

test('ordinary pilot inputs collect the upgrade before crossing and preserve first-help Close semantics', () => {
  const { world, pilot } = collecting();
  for (let frame = 0; frame < 100 && !pilot.helpClosed; frame++) world.step(pilot.input(world));
  expect(pilot.helpClosed).toBe(1);
  expect(pilot.upgrades).toEqual([{ level: 3, id: 'A10000041', classId: 1 }]);
  expect(world.progression.level).toBe(3);
  expect(world.mode).toBe('playing');
  expect(world.transit).toBeNull();
  expect(world.player.life).toBe(4);
  expect(world.pickups).toHaveLength(0);
});
