import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import art from '../src/game/data/screen-effect-art.json';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickBullet } from '../src/game/simulation/projectiles';
import { applyProjectileStatus } from '../src/game/simulation/status';
import { World, emptyInput } from '../src/game/simulation/world';
function setup() {
  const w = new World([], [], 9);
  w.hitTest = () => false;
  w.player.life = 40;
  w.field.enemies = [
    createTank(
      w.nextId(),
      { ...STARTER, avatar: false, parts: [STARTER.parts[0]], speed: 0, life: 100 },
      'enemy',
      200,
      0,
    ),
  ];
  return w;
}
const frames = (w: World, n: number) => {
  for (let i = 0; i < n; i++) w.step(emptyInput());
};
const queued = (w: World) => w.runtimeFor(w.field).effectQueue;
function hit(w: World, target = w.player) {
  const b = createProjectile(w.nextId(), {
    owner: w.field.enemies[0].uid,
    enemy: true,
    kind: 'shell',
    symbol: 13,
    status: 'ink',
    x: target.x,
    y: target.y,
    angle: 0,
    speed: 0,
    damage: 1,
  });
  w.hitTest = (tank) => tank === target;
  tickBullet(w, b, emptyInput());
  w.hitTest = () => false;
}

test('ink callback queues impact then an independent screen clip before shielded damage', () => {
  const w = setup();
  w.player.shield = 25;
  let observed = false;
  const damage = w.damage.bind(w);
  w.damage = (tank, amount, bullet) => {
    expect(queued(w).map((e) => [e.symbol, e.layer])).toEqual([
      [1723, 'top'],
      [11, 'screen'],
    ]);
    expect(tank.status.ink).toBe(121);
    observed = true;
    damage(tank, amount, bullet);
  };
  hit(w);
  expect(observed).toBe(true);
  expect(w.player.life).toBe(40);
  expect(queued(w)[1]).toMatchObject({ x: 0, y: 0, age: 0, duration: 100, randomRotation: true });
  expect(w.effects).toEqual([]);
});

test('existing ink blocks refresh and another overlay; broken forcefield presence blocks only artwork', () => {
  const w = setup();
  hit(w);
  frames(w, 1);
  const timer = w.player.status.ink;
  hit(w);
  expect(w.player.status.ink).toBe(timer);
  expect(queued(w).map((e) => e.symbol)).toEqual([1723]);
  const protectedWorld = setup();
  protectedWorld.player.design = {
    ...STARTER,
    parts: [...STARTER.parts, { ...STARTER.parts[1], type: 5005, key: 'field' }],
  };
  protectedWorld.player.forcefieldReady = false;
  hit(protectedWorld);
  expect(protectedWorld.player.status.ink).toBe(121);
  expect(queued(protectedWorld).map((e) => e.symbol)).toEqual([1723]);
});

test('enemy ink repeatedly hits allies and queues overlapping screen clips without an ally timer', () => {
  const w = setup();
  const ally = createTank(w.nextId(), { ...STARTER, avatar: false, life: 50 }, 'ally');
  w.allies.push(ally);
  hit(w, ally);
  hit(w, ally);
  expect(ally.status.ink).toBe(0);
  expect(ally.life).toBe(48);
  expect(w.player.status.ink).toBe(0);
  expect(queued(w).filter((e) => e.layer === 'screen')).toHaveLength(2);
});

test('queue registration consumes rotation RNG in source order and each instance has its own clock', () => {
  const w = setup(),
    ally = createTank(w.nextId(), { ...STARTER, avatar: false }, 'ally');
  applyProjectileStatus(w, ally, 'ink');
  applyProjectileStatus(w, ally, 'ink');
  w.field.enemies = []; // Isolate effect registration from unrelated AI random draws.
  let draws = 0;
  w.rng.next = () => (++draws === 1 ? 0.25 : 0.75);
  expect(draws).toBe(0);
  frames(w, 1);
  expect(w.effects.map((e) => [e.rotation, e.age])).toEqual([
    [90, 1],
    [270, 1],
  ]);
  expect(draws).toBe(2);
});

test('pause can pass the final frame and loop; resume only removes a clip observed at its current final frame', () => {
  const w = setup();
  applyProjectileStatus(w, w.player, 'ink');
  frames(w, 1);
  const effect = w.effects[0],
    timer = w.player.status.ink;
  w.pause();
  frames(w, 200);
  expect([effect.age, w.player.status.ink]).toEqual([201, timer]);
  expect(w.effects).toEqual([effect]);
  w.resume();
  frames(w, 1);
  expect(w.effects).toEqual([effect]);
  expect(w.player.status.ink).toBe(timer - 1);
  effect.age = 99;
  w.pause();
  frames(w, 100);
  expect(effect.age).toBe(199);
  expect(w.effects).toEqual([effect]);
  w.resume();
  frames(w, 1);
  expect(w.effects).toEqual([]);
  expect(w.player.status.ink).toBe(timer - 2);
});

test('avatar replacement resets its timer without removing an existing global ink clip', () => {
  const w = setup();
  applyProjectileStatus(w, w.player, 'ink');
  frames(w, 1);
  const effect = w.effects[0],
    old = w.player;
  w.editPlayer({ ...STARTER, id: 'replacement' });
  expect(w.player).not.toBe(old);
  expect(w.player.status.ink).toBe(0);
  expect(w.effects).toEqual([effect]);
});

test('arrival clears both screen layers and field effects without resetting surviving ink immunity timer', () => {
  const w = setup();
  applyProjectileStatus(w, w.player, 'ink');
  frames(w, 1);
  w.addCombatEffect({ x: 0, y: 0 }, 'collapseFlash', {}, true);
  w.jump({ x: 1, y: 0 });
  const timer = w.player.status.ink;
  w.player.x = w.transit!.target.x;
  w.player.y = w.transit!.target.y;
  frames(w, 1);
  expect(w.transit).toBeNull();
  expect(w.effects).toEqual([]);
  expect(w.player.status.ink).toBe(timer);
});

test('collapse completion starts escape before creating its original immediate screen flash', () => {
  const w = setup();
  w.beginCollapse(0);
  w.collapse!.age = 119;
  const jump = w.jump.bind(w);
  w.jump = (direction, deadhead) => {
    expect(w.effects.some((e) => e.symbol === art.collapseFlash.symbol)).toBe(false);
    jump(direction, deadhead);
  };
  frames(w, 1);
  expect(w.transit).not.toBeNull();
  expect(w.effects.find((e) => e.symbol === 114)).toMatchObject({
    x: 0,
    y: 0,
    layer: 'screen',
    duration: 30,
    randomRotation: true,
    age: 1,
  });
});

test('imported screen metadata retains independent lifetimes and authored fading opacity', () => {
  expect([
    art.ink.symbol,
    art.ink.frames,
    art.collapseFlash.symbol,
    art.collapseFlash.frames,
  ]).toEqual([11, 100, 114, 30]);
  expect(art.ink.opacity.slice(0, 60).every((a) => a === 1)).toBe(true);
  expect(art.ink.opacity[60]).toBe(0.9765625);
  expect(art.ink.opacity[99]).toBe(0);
  expect(art.collapseFlash.opacity[29]).toBe(0);
});
