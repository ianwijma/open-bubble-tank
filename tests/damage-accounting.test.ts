import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import {
  projectileTankCallback,
  projectileTankContact,
} from '../src/game/simulation/projectile-contact';
import { tickDamageBeam } from '../src/game/simulation/beams';
import { tickRepulsor } from '../src/game/simulation/repulsor';
import { tickSpinner } from '../src/game/simulation/spinner';
import { createTank } from '../src/game/simulation/tank';
import { tickTurret } from '../src/game/simulation/turrets';
import { tickWhip } from '../src/game/simulation/whip';
import { World } from '../src/game/simulation/world';

function setup(forcefield = false) {
  const world = new World([], [], 10);
  const target = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      parts: forcefield
        ? [...STARTER.parts, { ...STARTER.parts[1], key: 'forcefield', type: 5005 }]
        : STARTER.parts,
    },
    'enemy',
  );
  world.field.enemies = [target];
  world.hitTest = (tank) => tank === target;
  return { world, target };
}
function shot(world: World, options: Partial<Projectile> = {}) {
  return createProjectile(world.nextId(), {
    owner: world.player.uid,
    enemy: false,
    kind: 'shell',
    symbol: 1721,
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    damage: 10,
    ...options,
  });
}

test('contacts record nominal damage before shield, forcefield, weaken or overkill handling', () => {
  for (const mode of ['shield', 'forcefield', 'weaken', 'overkill'] as const) {
    const { world, target } = setup(mode === 'forcefield');
    if (mode === 'shield') target.shield = 1;
    if (mode === 'weaken') target.status.weaken = 10;
    if (mode === 'overkill') target.life = 1;
    projectileTankContact(world, shot(world));
    expect(world.stats.damageDone).toBe(10);
    expect(target.life).toBe(
      mode === 'shield' || mode === 'forcefield' ? 100 : mode === 'weaken' ? 80 : 0,
    );
  }
});

test('recursive forcefield overflow does not add a second counter entry', () => {
  const { world, target } = setup(true);
  target.status.weaken = 10;
  projectileTankContact(world, shot(world, { damage: 25 }));
  expect(target.life).toBe(80);
  expect(world.stats.damageDone).toBe(25);
});

test('callback-triggered area damage happens before counting and contributes no splash amount', () => {
  const { world, target } = setup();
  const neighbor = createTank(world.nextId(), { ...target.design }, 'enemy', 20, 0);
  world.field.enemies.push(neighbor);
  const events: [number, number, number][] = [];
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    events.push([tank.uid, amount, world.stats.damageDone]);
    damage(tank, amount, bullet);
  };
  projectileTankCallback(world, shot(world, { damage: 7, explode: 60, splashDamage: 20 }), target);
  expect(events).toEqual([
    [neighbor.uid, 20, 0],
    [target.uid, 7, 7],
  ]);
  expect([neighbor.life, target.life, world.stats.damageDone]).toEqual([80, 93, 7]);
});

test('base, Un and dp contact guards count each eligible enemy only once', () => {
  for (const [symbol, kind] of [
    [1721, 'shell'],
    [1728, 'pierce'],
    [1794, 'pierce'],
  ] as const) {
    const { world } = setup();
    const b = shot(world, { symbol, kind });
    expect(projectileTankContact(world, b)).toBe(true);
    expect(world.stats.damageDone).toBe(10);
    expect(projectileTankContact(world, b)).toBe(false);
    expect(world.stats.damageDone).toBe(10);
  }
});

test('enemy contact and friendly orbital override do not increment the counter', () => {
  const { world, target } = setup();
  world.player.life = 40;
  world.hitTest = () => true;
  projectileTankContact(world, shot(world, { enemy: true, damage: 3 }));
  expect(world.player.life).toBe(37);
  expect(world.stats.damageDone).toBe(0);
  projectileTankContact(world, shot(world, { kind: 'orbital', symbol: 2016, damage: 4 }));
  expect(target.life).toBe(96);
  expect(world.stats.damageDone).toBe(0);
});

test('Whip counts once per enemy before Damage, including a shielded contact', () => {
  const { world, target } = setup();
  target.shield = 1;
  const b = shot(world, { kind: 'whip', symbol: 2036, damage: 30 });
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    expect(world.stats.damageDone).toBe(30);
    expect(b.hit.has(tank.uid)).toBe(false);
    damage(tank, amount, bullet);
  };
  tickWhip(world, b);
  tickWhip(world, b);
  expect(target.life).toBe(100);
  expect(world.stats.damageDone).toBe(30);
});

test('enemy Spinner counts each ally/avatar hit frame after the impact callback', () => {
  const { world } = setup();
  const ally = createTank(world.nextId(), { ...STARTER, life: 100 }, 'ally');
  world.allies.push(ally);
  world.hitTest = () => true;
  const b = shot(world, { kind: 'spin', symbol: 2033, enemy: true, damage: 3 });
  const counts: number[] = [];
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    counts.push(world.stats.damageDone);
    expect(world.runtimeFor(world.field).effectQueue.length).toBe(counts.length);
    damage(tank, amount, bullet);
  };
  tickSpinner(world, b);
  tickSpinner(world, b);
  expect(ally.life).toBe(94);
  ally.dead = true;
  world.player.life = 40;
  tickSpinner(world, b);
  expect(world.player.life).toBe(37);
  expect(counts).toEqual([3, 6, 9]);
});

test('Repulsor invokes the zero-amount increment after force and before Damage, then remembers contact', () => {
  const { world, target } = setup();
  const b = shot(world, { kind: 'push', symbol: 2221, damage: 0 });
  const calls: string[] = [];
  const count = world.damageDoneIncr.bind(world),
    damage = world.damage.bind(world);
  world.damageDoneIncr = (amount) => {
    expect(target.velocity.x).toBeGreaterThan(0);
    expect(b.hit.size).toBe(0);
    calls.push(`count:${amount}`);
    count(amount);
  };
  world.damage = (tank, amount, bullet) => {
    calls.push(`damage:${amount}`);
    damage(tank, amount, bullet);
  };
  tickRepulsor(world, b);
  tickRepulsor(world, b);
  expect(calls).toEqual(['count:0', 'damage:0']);
  expect(world.stats.damageDone).toBe(0);
});

test('direct Damage, beam contact and turret interception retain their source absence of accounting', () => {
  const { world, target } = setup();
  world.damage(target, 1);
  const beam = shot(world, { kind: 'beam', symbol: 1992, damage: 2 });
  tickDamageBeam(world, beam, [target]);
  tickDamageBeam(world, beam, [target]);
  expect(target.life).toBe(97);
  const turret = shot(world, {
    owner: target.uid,
    kind: 'turret',
    symbol: 2444,
    enemy: true,
    health: 20,
    stopped: true,
  });
  world.bullets.push(shot(world, { damage: 4 }));
  world.hitProjectile = () => true;
  tickTurret(world, turret, target);
  expect(turret.health).toBe(16);
  expect(world.stats.damageDone).toBe(0);
});
