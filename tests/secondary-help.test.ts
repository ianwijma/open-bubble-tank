import { expect, test } from 'bun:test';
import { World, emptyInput } from '../src/game/simulation/world';
import { STARTER } from '../src/game/data/catalog';
import { HUD } from '../src/game/core/hud';

const shieldTank = {
  ...STARTER,
  parts: [...STARTER.parts, { ...STARTER.parts[1], key: 'shield', type: 3010 }],
};

test('only replacement avatars trigger secondary help; its early latch survives new runs', () => {
  const world = new World([], [STARTER, shieldTank], 50);
  expect(world.mode).toBe('playing');
  let saves = 0;
  world.onSecondaryHelp = () => {
    expect(world.secondaryHelpSeen).toBe(true);
    expect(world.mode).toBe('secondary-help');
    saves++;
  };
  world.editPlayer(shieldTank);
  expect(saves).toBe(1);
  const age = world.player.age;
  const hud = world.hud.fireY;
  world.pause();
  world.resume();
  for (let i = 0; i < 100; i++) world.step({ ...emptyInput(), fire: true, secondary: true });
  expect(world.mode).toBe('secondary-help');
  expect(world.player.age).toBe(age);
  expect(world.hud.fireY).toBe(hud);
  expect(world.stats.shots).toBe(0);
  world.closeSecondaryHelp();
  world.step({ ...emptyInput(), secondary: true });
  expect(world.player.shield).toBe(25);
  world.editPlayer(shieldTank);
  expect(world.mode).toBe('playing');
  expect(saves).toBe(1);
  const next = new World([], [], 50);
  next.secondaryHelpSeen = world.secondaryHelpSeen;
  next.editPlayer(shieldTank);
  expect(next.mode).toBe('playing');
});

test('choosing an upgrade preserves the help state and native centered placements', () => {
  const world = new World([], [], 50);
  world.player.life = 50;
  world.step(emptyInput());
  world.selectUpgrade(shieldTank);
  expect(world.mode).toBe('secondary-help');
  expect(world.offers).toEqual([]);
  const pieces = HUD.secondaryHelp;
  expect(pieces.map((p) => p.symbol)).toEqual([1869, 1870, 1875]);
  expect(pieces[0].x).toBeCloseTo(-11.575);
  expect(pieces[0].y).toBeCloseTo(-12.075);
  expect(pieces[2]).toMatchObject({ name: 'close_mc', x: 346.975, y: 271.925 });
});
