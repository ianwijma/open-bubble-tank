import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import { createTank } from '../src/game/simulation/tank';
import { applyProjectileStatus } from '../src/game/simulation/status';
import { World, emptyInput } from '../src/game/simulation/world';
const frames = (w: World, n: number) => {
  for (let i = 0; i < n; i++) w.step(emptyInput());
};

test('pause advances attached part, hit and forcefield artwork while gameplay and recharge remain frozen', () => {
  const w = new World([], [], 10),
    t = w.player;
  t.forcefieldFrame = 2;
  t.forcefield = 15;
  t.shieldHitAge = 0;
  t.status.jam = 20;
  const gunCounter = t.guns[0].counter;
  w.pause();
  frames(w, 10);
  expect([t.age, t.artAge, t.forcefieldFrame, t.shieldHitAge]).toEqual([0, 10, 12, 10]);
  expect([t.forcefield, t.forcefieldCounter, t.status.jam, t.guns[0].counter]).toEqual([
    15,
    0,
    20,
    gunCounter,
  ]);
  frames(w, 13);
  expect([t.forcefieldFrame, t.shieldHitAge]).toEqual([1, 16]);
  t.forcefieldFrame = 26;
  frames(w, 9);
  expect(t.forcefieldFrame).toBe(26);
  t.forcefieldFrame = 36;
  frames(w, 29);
  expect(t.forcefieldFrame).toBe(1);
});

test('shield film keeps its own26-frame stage clock independently of the25-frame cleanup effect', () => {
  const w = new World([], [], 10);
  w.player = createTank(
    w.nextId(),
    { ...STARTER, parts: [STARTER.parts[0], { ...STARTER.parts[1], type: 3010 }] },
    'player',
  );
  w.fireGun(w.player, w.player.guns[0], emptyInput());
  w.pause();
  frames(w, 60);
  expect([w.player.artAge, w.player.shieldAge, w.player.shield]).toEqual([60, 60, 25]);
  expect(w.runtimeFor(w.field).pending[0].frame).toBe(11);
  expect((w.player.shieldAge % 26) + 1).toBe(9);
});

test('transit advances avatar and both field populations once without running avatar gameplay', () => {
  const w = new World([], [], 10);
  const origin = createTank(w.nextId(), { ...STARTER, avatar: false }, 'enemy');
  w.field.enemies = [origin];
  w.jump({ x: 1, y: 0 });
  const next = w.transit!.next;
  const destination = createTank(w.nextId(), { ...STARTER, avatar: false }, 'enemy');
  next.enemies = [destination];
  const inactive = createTank(w.nextId(), STARTER, 'enemy');
  const detached = { ...next, col: 99, enemies: [inactive] };
  w.fields.set('99,0', detached);
  w.pause();
  frames(w, 5);
  expect([w.player.artAge, origin.artAge, destination.artAge, inactive.artAge]).toEqual([
    5, 5, 5, 0,
  ]);
  expect([w.player.age, origin.age, destination.age]).toEqual([0, 0, 0]);
  w.resume();
  frames(w, 1);
  expect(w.player.age).toBe(0);
  expect([w.player.artAge, origin.artAge, destination.artAge]).toEqual([6, 6, 6]);
});

test('attached status lifetime and visual origins use separate active and stage clocks', () => {
  const w = new World([], [], 10),
    t = w.player;
  w.pause();
  frames(w, 7);
  for (const kind of ['infect', 'ink', 'stun'] as const) applyProjectileStatus(w, t, kind);
  expect(t.infectStartedAt).toBe(7);
  expect(w.runtimeFor(w.field).effectQueue.filter((e) => e.layer === 'screen')[0].age).toBe(0);
  frames(w, 6);
  expect([t.age, t.artAge, t.infectCounter, t.status.ink]).toEqual([0, 13, 0, 121]);
  expect([t.statusDecoration!.age, t.statusDecoration!.artAge]).toEqual([0, 6]);
});
