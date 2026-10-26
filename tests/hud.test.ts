import { expect, test } from 'bun:test';
import { HudState, HUD, fireLayout, secondaryRate, weaponRows } from '../src/game/core/hud';
import { STARTER } from '../src/game/data/catalog';
import { World, emptyInput } from '../src/game/simulation/world';
import { applyProjectileStatus } from '../src/game/simulation/status';
import { createTank } from '../src/game/simulation/tank';

function player(...ids: number[]) {
  return createTank(
    123,
    {
      ...STARTER,
      parts: ids.map((type, i) => ({
        ...STARTER.parts[1],
        key: String(i),
        type,
      })),
    },
    'player',
    0,
    0,
    50,
    2,
  );
}
test('HUD motion uses original frame easing and detects health changes after motion', () => {
  const hud = new HudState();
  hud.advance(1, 54);
  expect(hud.lifeY).toBeCloseTo(496.04, 8);
  expect(hud.lifeIdle).toBe(0);
  hud.advance(1, 54);
  expect(hud.lifeY).toBeCloseTo(476.072, 8);
  for (let i = 0; i < 74; i++) hud.advance(1, 54);
  expect(hud.lifeIdle).toBe(75);
  const visibleY = hud.lifeY;
  hud.advance(2, 54);
  expect(hud.lifeY).toBeGreaterThan(visibleY);
  expect(hud.lifeIdle).toBe(0);
  const retreatY = hud.lifeY;
  hud.advance(2, 54);
  expect(hud.lifeY).toBeLessThan(retreatY);
});
test('fire panel retreats by its full authored height after 75 idle frames', () => {
  const hud = new HudState();
  hud.revealFire();
  for (let i = 0; i < 75; i++) hud.advance(1, 54);
  expect(hud.fireIdle).toBe(75);
  expect(hud.fireY).toBeCloseTo(HUD.fire.y, 4);
  for (let i = 0; i < 100; i++) hud.advance(1, 54);
  expect(hud.fireY).toBeCloseTo(-141.5, 6);
  expect(fireLayout(9).height).toBe(177);
});
test('weapon rows retain first mount order, first counter and native short names', () => {
  const tank = player(2002, 2001, 2002, 3010, 5006);
  tank.guns[0].counter = 10;
  tank.guns[2].counter = 0;
  const rows = weaponRows(tank);
  expect(rows.map((r) => [r.gun.part.type, r.count, r.label])).toEqual([
    [2002, 2, "HC's"],
    [2001, 1, 'BC'],
  ]);
  expect(rows[0].gun).toBe(tank.guns[0]);
  tank.guns[1].counter = 6;
  expect(weaponRows(tank)[1].fill).toBeCloseTo(7 / 13, 8);
  tank.guns[1].counter = -1;
  expect(weaponRows(tank)[1].fill).toBe(1);
  expect(secondaryRate(tank)).toBeGreaterThan(0);
});
test('holding primary reveals HUD between shots, including when jammed', () => {
  const world = new World([], [], 1);
  applyProjectileStatus(world, world.player, 'jam', 200);
  const input = { ...emptyInput(), fire: true };
  for (let i = 0; i < 100; i++) world.step(input);
  expect(world.stats.shots).toBe(0);
  expect(world.hud.fireIdle).toBe(1);
  expect(world.hud.fireY).toBeCloseTo(HUD.fire.y, 6);
});
test('secondary cooldown input and automatic weapons do not keep the fire HUD awake', () => {
  const world = new World([], [], 1);
  world.player = player(3010);
  world.player.life = 2;
  world.secondaryCounter = 200;
  world.step({ ...emptyInput(), secondary: true });
  expect(world.hud.fireIdle).toBe(75);
  world.secondaryCounter = 0;
  world.step({ ...emptyInput(), secondary: true });
  expect(world.hud.fireIdle).toBe(1);
  world.player = player(5006);
  world.player.life = 2;
  for (let i = 0; i < 80; i++) world.step(emptyInput());
  expect(world.stats.shots).toBeGreaterThan(0);
  expect(world.hud.fireIdle).toBe(75);
});
test('HUD clocks advance during crossings and freeze during pause or Apocalypse control suspension', () => {
  const world = new World([], [], 1);
  world.step({ ...emptyInput(), fire: true });
  world.jump({ x: 1, y: 0 });
  const y = world.hud.fireY;
  world.step(emptyInput());
  expect(world.hud.fireY).not.toBe(y);
  expect(world.hud.fireIdle).toBe(2);
  world.pause();
  const paused = world.hud.fireY;
  world.step({ ...emptyInput(), fire: true });
  expect(world.hud.fireY).toBe(paused);
  world.resume();
  world.beginCollapse(0);
  world.step(emptyInput());
  expect(world.hud.fireIdle).toBe(2);
  expect(world.hud.fireY).toBe(paused);
});
