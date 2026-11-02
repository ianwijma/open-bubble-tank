import { expect, test } from 'bun:test';
import { STARTER } from '../src/game/data/catalog';
import type { Projectile } from '../src/game/core/types';
import { World, emptyInput } from '../src/game/simulation/world';
import { createTank } from '../src/game/simulation/tank';
import { createProjectile } from '../src/game/simulation/create-projectile';
import { tickTurret, builderHitsObject } from '../src/game/simulation/turrets';
import {
  projectileCallback,
  projectileTankCallback,
} from '../src/game/simulation/projectile-contact';

function setup() {
  const world = new World([], [], 19);
  world.rng.next = () => 0.5;
  world.progression.level = 6;
  const tank = createTank(
    world.nextId(),
    { ...STARTER, avatar: false, life: 100, speed: 0, reward: 0, parts: [STARTER.parts[0]] },
    'enemy',
    100,
    0,
  );
  world.field.enemies = [tank];
  const shot = (options: Partial<Projectile> = {}) =>
    createProjectile(world.nextId(), {
      owner: world.player.uid,
      enemy: false,
      kind: 'shell',
      symbol: 1721,
      x: 100,
      y: 0,
      angle: 0,
      speed: 0,
      damage: 1,
      ...options,
    });
  const hits = () => world.drainEvents().filter((e) => e.type === 'hit');
  return { world, tank, shot, hits };
}
test('direct Damage and primary beam damage do not invent a collision sound', () => {
  const { world, tank, shot, hits } = setup();
  world.damage(tank, 1);
  world.damage(tank, 1, shot({ kind: 'beam', symbol: 1992 }));
  expect(tank.life).toBe(98);
  expect(hits()).toHaveLength(0);
});
test('friendly shell callback sounds before shield absorption; enemy shell damage to an ally stays silent', () => {
  const { world, tank, shot, hits } = setup();
  tank.shield = 100;
  projectileTankCallback(world, shot(), tank);
  expect(tank.life).toBe(100);
  expect(hits()).toHaveLength(1);
  const ally = createTank(world.nextId(), tank.design, 'ally', 100, 0);
  projectileTankCallback(world, shot({ enemy: true, symbol: 1717 }), ally);
  expect(ally.life).toBe(99);
  expect(hits()).toHaveLength(0);
});
test('interception dispatch honors the source collision argument independently of projectile ownership', () => {
  const { world, shot, hits } = setup();
  const friendly = shot();
  projectileCallback(world, friendly, shot({ enemy: true }));
  expect(hits()).toHaveLength(1);
});
test('leech damage and massive-pierce area callbacks keep their silent overrides', () => {
  const { world, tank, shot, hits } = setup();
  projectileTankCallback(world, shot({ kind: 'leech', symbol: 1813 }), tank);
  projectileTankCallback(world, shot({ kind: 'pierce', symbol: 1794 }), tank);
  expect(tank.life).toBe(98);
  expect(hits()).toHaveLength(0);
});
test('one shared world cooldown gates same-frame callbacks and keeps the source zero-reset frame', () => {
  const { world, shot, hits } = setup();
  projectileCallback(world, shot());
  projectileCallback(world, shot());
  expect(hits()).toHaveLength(1);
  world.pause();
  for (let i = 0; i < 4; i++) {
    world.step(emptyInput());
    projectileCallback(world, shot());
    expect(hits()).toHaveLength(0);
  }
  world.step(emptyInput());
  projectileCallback(world, shot());
  expect(hits()).toHaveLength(1);
});
test('silent enemy Apocalypse callback still resets the gate, unlike the base enemy callback', () => {
  const { world, shot, hits } = setup();
  projectileCallback(world, shot({ enemy: true, symbol: 1717 }));
  projectileCallback(world, shot());
  expect(hits()).toHaveLength(1);
  for (let i = 0; i < 5; i++) world.step(emptyInput());
  projectileCallback(world, shot({ enemy: true, kind: 'apocalypse', symbol: 2058 }));
  projectileCallback(world, shot());
  expect(hits()).toHaveLength(0);
});

test('turret damage forwards its enemy flag and only the lethal turret callback uses false', () => {
  const { world, tank, shot, hits } = setup();
  const turret = shot({ kind: 'turret', symbol: 2444, enemy: true, owner: tank.uid, health: 2 });
  world.bullets = [turret, shot()];
  world.hitProjectile = () => true;
  tickTurret(world, turret, tank);
  expect(turret.health).toBe(1);
  expect(hits()).toHaveLength(0);
  tickTurret(world, turret, tank);
  expect(turret.dead).toBe(true);
  expect(hits()).toHaveLength(1);
});
test('enemy builder contact silently closes the shared hit gate before a later friendly contact', () => {
  const { world, shot, hits } = setup();
  world.hitTest = () => true;
  const builder = shot({ kind: 'builder', symbol: 2440, enemy: true });
  expect(builderHitsObject(world, builder)).toBe(true);
  projectileCallback(world, shot());
  expect(hits()).toHaveLength(0);
});
test('the sticky callback writes its status before requesting the hit sound', () => {
  const { world, tank, shot } = setup();
  const emit = world.emit.bind(world);
  let stickyAtSound = false;
  world.emit = (type, ...args) => {
    if (type === 'hit') stickyAtSound = tank.status.sticky > 0;
    return emit(type, ...args);
  };
  projectileTankCallback(world, shot({ symbol: 1802, status: 'sticky' }), tank);
  expect(stickyAtSound).toBe(true);
});
