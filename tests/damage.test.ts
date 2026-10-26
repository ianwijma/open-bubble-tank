import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { bodyWeights } from '../src/game/simulation/degradation';
import { createTank, healTank } from '../src/game/simulation/tank';
import { World, emptyInput } from '../src/game/simulation/world';
import type { TankDesign } from '../src/game/core/types';

function design(): TankDesign {
  return {
    ...STARTER,
    avatar: false,
    life: 100,
    parts: [
      ...[3, 2, 1].map((scale, i) => ({
        ...STARTER.parts[0],
        key: `b${i}`,
        x: 0,
        y: 0,
        type: 1001,
        scale,
        radius: [10, 40, 20][i],
      })),
      { ...STARTER.parts[1], key: 'gun', x: 0, y: 0, type: 4001 },
    ],
  };
}

test('body loss uses all mounts in its budget and picks an affordable body rather than overspending', () => {
  const world = new World(),
    tank = createTank(50, design(), 'enemy');
  expect(bodyWeights(tank.design).map((entry) => entry.weight)).toEqual([9, 4, 1]);
  expect(tank.degradation.total).toBe(3.5);
  world.damage(tank, 50);
  expect([...tank.hiddenParts]).toEqual(['b2']);
  expect(tank.degradation.debt).toBeCloseTo(0.75);
  expect(tank.degradation.minimum).toBe(4);
  world.damage(tank, 40);
  expect(tank.life).toBe(10);
  expect([...tank.hiddenParts]).toEqual(['b2']);
  expect(tank.degradation.debt).toBeCloseTo(2.15);
});

test('the outermost affordable body wins over a cheaper inner body, with guns retained', () => {
  const world = new World(),
    data = design();
  data.parts = [
    { ...data.parts[2], key: 'cheap', radius: 1 },
    ...Array.from({ length: 6 }, (_, i) => ({ ...data.parts[0], key: `heavy${i}`, radius: 3 })),
    { ...data.parts[1], key: 'outside', radius: 100 },
    data.parts[3],
  ];
  const tank = createTank(51, data, 'enemy');
  world.damage(tank, 50);
  expect([...tank.hiddenParts]).toEqual(['outside']);
  expect(tank.hiddenParts.has('cheap')).toBe(false);
  expect(tank.hiddenParts.has('gun')).toBe(false);
});

test('player construction, damage and healing keep the complete tank body', () => {
  const world = new World(),
    data = { ...design(), avatar: true };
  const tank = createTank(52, data, 'player', 0, 0, 100, 1);
  expect(tank.hiddenParts.size).toBe(0);
  tank.life = 100;
  world.damage(tank, 99);
  expect(tank.hiddenParts.size).toBe(0);
  expect(tank.degradation.debt).toBe(0);
  healTank(tank, 200);
  expect(tank.life).toBe(100);
  expect(tank.hiddenParts.size).toBe(0);
});

test('enemy healing restores bodies but retains debt and the previously stored minimum', () => {
  const world = new World(),
    tank = createTank(53, design(), 'enemy');
  world.damage(tank, 50);
  healTank(tank, 10);
  expect(tank.life).toBe(60);
  expect(tank.hiddenParts.size).toBe(0);
  expect(tank.degradation.debt).toBeCloseTo(2.15);
  expect(tank.degradation.minimum).toBe(4);
  healTank(tank, 10);
  expect(tank.degradation.debt).toBeCloseTo(3.2);
  world.damage(tank, 30);
  expect([...tank.hiddenParts]).toEqual(['b1']);
  expect(tank.degradation.debt).toBeCloseTo(0.25);
});

test('ally healing leaves its damaged bodies hidden, and only avatar designs cap healed life', () => {
  const world = new World(),
    ally = createTank(54, design(), 'ally');
  world.damage(ally, 50);
  healTank(ally, 60);
  expect(ally.life).toBe(110);
  expect([...ally.hiddenParts]).toEqual(['b2']);
  expect(ally.degradation.debt).toBeCloseTo(0.75);
  const enemy = createTank(55, design(), 'enemy');
  healTank(enemy, 1.9);
  expect(enemy.life).toBe(101);
});

test('damage uses an int argument and class armor does not reduce it', () => {
  const world = new World();
  for (const classId of [1, 2, 3, 4, 5, 6]) {
    const tank = createTank(60 + classId, { ...design(), avatar: true, classId }, 'player');
    world.damage(tank, 1.9);
    expect(tank.life).toBe(99);
    world.damage(tank, 0.9);
    expect(tank.life).toBe(99);
  }
});

test('forcefield overflow re-enters Damage and applies its weaken multiplier again', () => {
  const world = new World(),
    data = design();
  data.parts.push({ ...STARTER.parts[1], key: 'forcefield', type: 5005 });
  const tank = createTank(70, data, 'player');
  // Base Forcefield blocks the weaken projectile. This artificial combination tests the
  // recovered Damage contract for extensions, not an obtainable shipped loadout/status.
  tank.status.weaken = 80;
  world.damage(tank, 25);
  expect(tank.forcefieldReady).toBe(false);
  expect(tank.forcefield).toBe(-15);
  expect(tank.life).toBe(80);
});

test('player hurt sound is gated by eight active tank frames and freezes during pause', () => {
  const world = new World();
  world.player.life = 40;
  world.damage(world.player, 1);
  world.damage(world.player, 1);
  expect(world.drainEvents().filter((event) => event.type === 'hurt')).toHaveLength(1);
  world.pause();
  for (let i = 0; i < 100; i++) world.step(emptyInput());
  expect(world.player.hurtCounter).toBe(7);
  world.resume();
  for (let i = 0; i < 7; i++) world.step(emptyInput());
  world.damage(world.player, 1);
  expect(world.drainEvents().filter((event) => event.type === 'hurt')).toHaveLength(0);
  world.step(emptyInput());
  world.damage(world.player, 1);
  expect(world.drainEvents().filter((event) => event.type === 'hurt')).toHaveLength(1);
  world.damage(world.player, 1000);
  expect(world.drainEvents().filter((event) => event.type === 'hurt')).toHaveLength(0);
});

test('zero-damage player impacts still use the source hurt channel', () => {
  const world = new World();
  world.damage(world.player, 0.5);
  expect(world.player.life).toBe(1);
  expect(world.drainEvents().filter((event) => event.type === 'hurt')).toHaveLength(1);
});

test('infection damages before weaken clears on its last active frame', () => {
  const world = new World();
  world.player.life = 40;
  world.player.status.weaken = 1;
  world.player.status.infect = Infinity;
  world.player.infectCounter = 11;
  world.step(emptyInput());
  expect(world.player.life).toBe(38);
  expect(world.player.status.weaken).toBe(0);
});
