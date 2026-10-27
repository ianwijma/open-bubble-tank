import { expect, test } from 'bun:test';
import type { Projectile } from '../src/game/core/types';
import { STARTER } from '../src/game/data/catalog';
import { createProjectile } from '../src/game/simulation/create-projectile';
import {
  projectileCallback,
  projectileTankContact,
} from '../src/game/simulation/projectile-contact';
import { tickRepulsor } from '../src/game/simulation/repulsor';
import { tickSpinner } from '../src/game/simulation/spinner';
import { createTank } from '../src/game/simulation/tank';
import { tickWhip } from '../src/game/simulation/whip';
import { World } from '../src/game/simulation/world';

function setup(carrier = false) {
  const world = new World([], [], 10);
  const target = createTank(
    world.nextId(),
    {
      ...STARTER,
      avatar: false,
      life: 100,
      parts: carrier ? [STARTER.parts[0], { ...STARTER.parts[1], type: 4013 }] : STARTER.parts,
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
function remember(b: Projectile, check: () => void) {
  const add = b.hit.add.bind(b.hit);
  b.hit.add = (uid) => {
    check();
    return add(uid);
  };
}

test('friendly base contact flags after Damage and memory even when its damage is shielded', () => {
  const { world, target } = setup();
  const b = shot(world);
  target.shield = 1;
  const events: string[] = [];
  const damage = world.damage.bind(world);
  world.damage = (tank, amount, bullet) => {
    expect(b.missExempt).toBeUndefined();
    expect(b.hit.size).toBe(0);
    events.push('damage');
    damage(tank, amount, bullet);
  };
  remember(b, () => {
    expect(b.missExempt).toBeUndefined();
    events.push('remember');
  });
  expect(projectileTankContact(world, b)).toBe(true);
  expect(events).toEqual(['damage', 'remember']);
  expect(b.missExempt).toBe(true);
  expect(target.life).toBe(100);
  expect(world.stats.damageDone).toBe(10);
});

test('Un and Massive set their flag after removal-time callbacks observe false', () => {
  for (const symbol of [1728, 1794]) {
    const { world, target } = setup();
    target.life = 1;
    const b = shot(world, { kind: 'pierce', symbol });
    const events: string[] = [];
    remember(b, () => {
      expect(b.missExempt).toBeUndefined();
      events.push('remember');
    });
    const flush = world.flushEnemyRemovals.bind(world);
    world.flushEnemyRemovals = () => {
      expect(b.hit.has(target.uid)).toBe(true);
      expect(b.missExempt).toBeUndefined();
      expect(target.dead).toBe(true);
      events.push('cleanup');
      flush();
    };
    projectileTankContact(world, b);
    expect(events).toEqual(['remember', 'cleanup']);
    expect(b.missExempt).toBe(true);
  }
});

test('carrier interception can enter Massive hit memory without setting its miss flag', () => {
  for (const symbol of [1721, 1794]) {
    const { world, target } = setup(true);
    const b = shot(world, { kind: symbol === 1794 ? 'pierce' : 'shell', symbol });
    world.hitPart = () => true;
    expect(projectileTankContact(world, b)).toBe(false);
    expect(b.hit.has(target.uid)).toBe(symbol === 1794);
    expect(b.missExempt).toBeUndefined();
    expect(world.stats.damageDone).toBe(0);
  }
});

test('enemy base, enemy seeker and friendly orbital contacts do not flag their hit memory', () => {
  for (const kind of ['shell', 'seeker', 'orbital'] as const) {
    const { world, target } = setup();
    const b = shot(world, { kind, enemy: kind !== 'orbital' });
    world.player.life = 40;
    world.hitTest = () => true;
    expect(projectileTankContact(world, b)).toBe(true);
    expect(b.hit.has(kind === 'orbital' ? target.uid : world.player.uid)).toBe(true);
    expect(b.missExempt).toBeUndefined();
  }
});

test('callback-only and direct damage paths neither set nor infer a flag from remembered hits', () => {
  const { world, target } = setup();
  const b = shot(world);
  b.hit.add(target.uid);
  expect(projectileTankContact(world, b)).toBe(false);
  projectileCallback(world, b, target);
  world.damage(target, b.damage, b);
  expect(b.hit.size).toBe(1);
  expect(b.missExempt).toBeUndefined();
});

test('Whip sets the flag after remembering and before queuing its authored effect', () => {
  const { world } = setup();
  const b = shot(world, { kind: 'whip', symbol: 2036, damage: 30 });
  const events: string[] = [];
  remember(b, () => {
    expect(b.missExempt).toBeUndefined();
    events.push('remember');
  });
  const effect = world.addCombatEffect.bind(world);
  world.addCombatEffect = (pos, kind, options, immediate) => {
    expect(b.missExempt).toBe(true);
    expect(b.hit.size).toBe(1);
    events.push('effect');
    return effect(pos, kind, options, immediate);
  };
  tickWhip(world, b);
  expect(events).toEqual(['remember', 'effect']);
  expect(b.missExempt).toBe(true);
});

test('zero-damage Repulsor sets the flag after its explicit cleanup', () => {
  const { world, target } = setup();
  const b = shot(world, { kind: 'push', symbol: 2221, damage: 0 });
  let cleaned = false;
  const flush = world.flushEnemyRemovals.bind(world);
  world.flushEnemyRemovals = () => {
    expect(b.missExempt).toBeUndefined();
    expect(b.hit.has(target.uid)).toBe(true);
    cleaned = true;
    flush();
  };
  tickRepulsor(world, b);
  expect(cleaned).toBe(true);
  expect(b.missExempt).toBe(true);
  expect(target.life).toBe(100);
});

test('Spinner callback, damage and memory precede its flag, which persists independently', () => {
  const { world } = setup();
  const ally = createTank(world.nextId(), { ...STARTER, life: 100 }, 'ally');
  world.allies.push(ally);
  world.hitTest = () => true;
  const b = shot(world, { kind: 'spin', symbol: 2033, enemy: true, damage: 3 });
  const events: string[] = [];
  const effect = world.addCombatEffect.bind(world),
    damage = world.damage.bind(world);
  world.addCombatEffect = (pos, kind, options, immediate) => {
    expect(b.missExempt).toBeUndefined();
    events.push('effect');
    return effect(pos, kind, options, immediate);
  };
  world.damage = (tank, amount, bullet) => {
    expect(b.missExempt).toBeUndefined();
    events.push('damage');
    damage(tank, amount, bullet);
  };
  remember(b, () => {
    expect(b.missExempt).toBeUndefined();
    events.push('remember');
  });
  tickSpinner(world, b);
  expect(events).toEqual(['effect', 'damage', 'remember']);
  expect(b.missExempt).toBe(true);
  b.hit.clear();
  world.hitTest = () => false;
  tickSpinner(world, b);
  expect(b.hit.size).toBe(0);
  expect(b.missExempt).toBe(true);
});
